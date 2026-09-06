"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserSession } from "./expenses";
import { calculateGroupBalances } from "@/lib/calculations/balances";
import { simplifyDebts } from "@/lib/calculations/simplify";

export interface CreateGroupInput {
  name: string;
  description?: string;
  currency?: string;
  memberEmails?: string[];
}

/**
 * Fetch all groups the current user is a member of
 */
export async function getGroups() {
  const session = await getCurrentUserSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      invitations: {
        where: { status: "PENDING" },
        include: {
          recipient: { select: { id: true, name: true, email: true } },
        },
      },
      expenses: {
        include: {
          payers: true,
          participants: true,
        },
      },
      settlements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch direct settlements involving the current user that might not have groupId explicitly set
  const directSettlements = await prisma.settlement.findMany({
    where: {
      groupId: null,
      OR: [{ payerId: userId }, { receiverId: userId }],
    },
  });

  return groups.map((g) => {
    const memberIds = g.members.map((m) => m.userId);

    // Combine explicit group settlements and any direct settlements between group members
    const groupSettlements = [
      ...g.settlements,
      ...directSettlements.filter(
        (s) => memberIds.includes(s.payerId) && memberIds.includes(s.receiverId)
      ),
    ];

    // Compute deterministic group balances
    const balanceMap = calculateGroupBalances(
      memberIds,
      g.expenses.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        payers: e.payers.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
        splits: e.participants.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
      })),
      groupSettlements.map((s) => ({
        id: s.id,
        payerId: s.payerId,
        receiverId: s.receiverId,
        amount: Number(s.amount),
      }))
    );

    const userBalance = balanceMap.get(userId)?.netBalance || 0;
    const totalSpent = g.expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const simplified = simplifyDebts(balanceMap);

    return {
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      currency: g.currency,
      createdById: g.createdById,
      totalSpent,
      userNetBalance: userBalance,
      members: g.members.map((m) => {
        const b = balanceMap.get(m.userId) || { totalPaid: 0, totalShare: 0, netBalance: 0 };
        return {
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.image || undefined,
          role: m.role,
          totalPaid: b.totalPaid,
          totalShare: b.totalShare,
          netBalance: b.netBalance,
        };
      }),
      debts: simplified.map((tx) => ({
        fromUserId: tx.from,
        fromUserName: g.members.find((m) => m.userId === tx.from)?.user.name || "Member",
        toUserId: tx.to,
        toUserName: g.members.find((m) => m.userId === tx.to)?.user.name || "Member",
        amount: tx.amount,
      })),
      pendingInvitations: g.invitations.map((inv) => ({
        id: inv.id,
        email: inv.email || inv.recipient?.email || "Invited Member",
        name: inv.recipient?.name || undefined,
        createdAt: inv.createdAt.toISOString().split("T")[0],
      })),
    };
  });
}

/**
 * Fetch pending group invitations for the current authenticated user
 */
export async function getPendingInvitations() {
  const session = await getCurrentUserSession();
  if (!session?.user) return [];

  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase();

  const invitations = await prisma.groupInvitation.findMany({
    where: {
      status: "PENDING",
      OR: [
        { recipientId: userId },
        ...(userEmail ? [{ email: { equals: userEmail, mode: "insensitive" as const } }] : []),
      ],
    },
    include: {
      group: { select: { id: true, name: true, description: true, currency: true } },
      sender: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    groupId: inv.groupId,
    groupName: inv.group.name,
    groupDescription: inv.group.description || undefined,
    currency: inv.group.currency,
    senderName: inv.sender.name || "A friend",
    senderEmail: inv.sender.email,
    createdAt: inv.createdAt.toISOString().split("T")[0],
  }));
}

/**
 * Accept a group invitation so the user joins the group as a confirmed member
 */
export async function acceptGroupInvitation(invitationId: string) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase();

  const invitation = await prisma.groupInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.status !== "PENDING") {
    throw new Error("Invitation not found or already processed");
  }

  // Verify the invitation belongs to this user
  if (invitation.recipientId && invitation.recipientId !== userId) {
    if (invitation.email && invitation.email.toLowerCase() !== userEmail) {
      throw new Error("You are not authorized to accept this invitation");
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update invitation status
    await tx.groupInvitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED", recipientId: userId },
    });

    // 2. Add user as group member (or ignore if already member)
    const existing = await tx.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: invitation.groupId,
          userId,
        },
      },
    });

    if (!existing) {
      await tx.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId,
          role: "MEMBER",
        },
      });
    }
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Reject a group invitation
 */
export async function rejectGroupInvitation(invitationId: string) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.groupInvitation.update({
    where: { id: invitationId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Create a new group (creator is OWNER, invited friends receive PENDING invitations)
 */
export async function createGroup(data: CreateGroupInput) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;

  // 1. Create group with creator as OWNER
  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      currency: data.currency || "INR",
      createdBy: { connect: { id: userId } },
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  // 2. For invited member emails, create PENDING invitations (require explicit acceptance)
  if (data.memberEmails && data.memberEmails.length > 0) {
    const uniqueEmails = Array.from(
      new Set(data.memberEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))
    );

    for (const email of uniqueEmails) {
      if (email === session.user.email?.toLowerCase()) continue;

      const foundUser = await prisma.user.findUnique({
        where: { email },
      });

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await prisma.groupInvitation.create({
        data: {
          groupId: group.id,
          senderId: userId,
          recipientId: foundUser ? foundUser.id : undefined,
          email,
          status: "PENDING",
          expiresAt: expiry,
        },
      });
    }
  }

  revalidatePath("/");
  return group;
}

/**
 * Get detailed group balance sheets and simplified debt graphs
 */
export async function getGroupSettlementPlan(groupId: string) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        include: { payers: true, participants: true },
      },
      settlements: true,
    },
  });

  if (!group) throw new Error("Group not found");

  const memberIds = group.members.map((m) => m.userId);

  const directSettlements = await prisma.settlement.findMany({
    where: {
      groupId: null,
      payerId: { in: memberIds },
      receiverId: { in: memberIds },
    },
  });

  const allGroupSettlements = [
    ...group.settlements,
    ...directSettlements,
  ];

  const balanceMap = calculateGroupBalances(
    memberIds,
    group.expenses.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      payers: e.payers.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
      splits: e.participants.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
    })),
    allGroupSettlements.map((s) => ({
      id: s.id,
      payerId: s.payerId,
      receiverId: s.receiverId,
      amount: Number(s.amount),
    }))
  );

  const simplified = simplifyDebts(balanceMap);

  return {
    group: {
      id: group.id,
      name: group.name,
      currency: group.currency,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        netBalance: balanceMap.get(m.user.id)?.netBalance || 0,
      })),
    },
    simplifiedTransactions: simplified.map((tx) => ({
      fromUserId: tx.from,
      fromUserName: group.members.find((m) => m.userId === tx.from)?.user.name || "Member",
      toUserId: tx.to,
      toUserName: group.members.find((m) => m.userId === tx.to)?.user.name || "Member",
      amount: tx.amount,
    })),
  };
}
