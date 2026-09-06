"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserSession } from "./expenses";

/**
 * Fetch accepted friends and pending requests
 */
export async function getFriends() {
  const session = await getCurrentUserSession();
  if (!session?.user) return { friends: [], pendingRequests: [] };

  const userId = session.user.id;

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      friend: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const friends = [];
  const pendingRequests = [];

  for (const f of friendships) {
    if (f.status === "ACCEPTED") {
      const friendObj = f.userId === userId ? f.friend : f.user;
      friends.push(friendObj);
    } else if (f.status === "PENDING" && f.friendId === userId) {
      pendingRequests.push({
        friendshipId: f.id,
        user: f.user,
      });
    }
  }

  return { friends, pendingRequests };
}

/**
 * Send a friend request by email
 */
export async function sendFriendRequest(email: string) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const targetUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!targetUser) throw new Error("User not found with this email");
  if (targetUser.id === session.user.id) throw new Error("Cannot add yourself as a friend");

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: session.user.id, friendId: targetUser.id },
        { userId: targetUser.id, friendId: session.user.id },
      ],
    },
  });

  if (existing) throw new Error("Friendship or request already exists");

  const friendship = await prisma.friendship.create({
    data: {
      userId: session.user.id,
      friendId: targetUser.id,
      status: "PENDING",
    },
  });

  revalidatePath("/");
  return friendship;
}

/**
 * Accept or reject a friend request
 */
export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      status: accept ? "ACCEPTED" : "REJECTED",
    },
  });

  revalidatePath("/");
  return updated;
}
