"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserSession } from "./expenses";

export interface CreateSettlementInput {
  groupId?: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  note?: string;
}

/**
 * Fetch all settlements involving the current user
 */
export async function getSettlements() {
  const session = await getCurrentUserSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  const settlements = await prisma.settlement.findMany({
    where: {
      OR: [{ payerId: userId }, { receiverId: userId }],
    },
    include: {
      group: { select: { id: true, name: true } },
      payer: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });

  return settlements.map((s) => ({
    id: s.id,
    groupId: s.groupId || undefined,
    groupName: s.group?.name || undefined,
    payerId: s.payerId,
    payerName: s.payer.name,
    receiverId: s.receiverId,
    receiverName: s.receiver.name,
    amount: Number(s.amount),
    currency: s.currency,
    date: s.date.toISOString().split("T")[0],
    status: s.status,
    note: s.note || undefined,
  }));
}

/**
 * Record a new settlement between members
 */
export async function createSettlement(data: CreateSettlementInput) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  let groupId = data.groupId || null;
  if (!groupId) {
    // Find first shared group between payer and receiver
    const sharedGroup = await prisma.group.findFirst({
      where: {
        AND: [
          { members: { some: { userId: data.payerId } } },
          { members: { some: { userId: data.receiverId } } },
        ],
      },
      select: { id: true },
    });
    if (sharedGroup) {
      groupId = sharedGroup.id;
    }
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId: groupId || undefined,
      payerId: data.payerId,
      receiverId: data.receiverId,
      amount: data.amount,
      currency: data.currency || "INR",
      paymentMethod: data.paymentMethod || "UPI",
      note: data.note,
      status: "COMPLETED",
    },
  });

  revalidatePath("/");
  return settlement;
}
