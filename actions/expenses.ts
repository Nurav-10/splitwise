"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { SplitType } from "@/lib/calculations/split";

export async function getCurrentUserSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export interface CreateGroupExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
  merchant?: string;
  description?: string;
  groupId: string;
  splitType: SplitType;
  payers: { userId: string; amount: number }[];
  splits: { userId: string; amount: number; percentage?: number; shares?: number }[];
}

export interface CreatePersonalExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
  merchant?: string;
  description?: string;
}

/**
 * Fetch all expenses for the current authenticated user (personal + group)
 */
export async function getExpenses() {
  const session = await getCurrentUserSession();
  if (!session?.user) {
    return [];
  }

  const userId = session.user.id;

  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { userId },
        { group: { members: { some: { userId } } } },
        { participants: { some: { userId } } },
        { payers: { some: { userId } } },
      ],
    },
    include: {
      group: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true } },
      payers: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      participants: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  return expenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    currency: e.currency,
    category: e.category?.name || "General",
    date: e.date.toISOString().split("T")[0],
    paymentMethod: e.paymentMethod || "UPI",
    merchant: e.merchant || undefined,
    description: e.description || undefined,
    groupId: e.groupId || undefined,
    groupName: e.group?.name || undefined,
    splitType: e.splitType,
    isGroup: e.isGroup,
    payers: e.payers.map((p) => ({
      userId: p.userId,
      userName: p.user.name,
      amount: Number(p.amount),
    })),
    splits: e.participants.map((p) => ({
      userId: p.userId,
      userName: p.user.name,
      amount: Number(p.amount),
      percentage: p.percentage ? Number(p.percentage) : undefined,
      shares: p.shares || undefined,
    })),
  }));
}

/**
 * Create a shared group expense with multi-payers and participant splits in an atomic operation
 */
export async function createGroupExpense(data: CreateGroupExpenseInput) {
  const session = await getCurrentUserSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // 1. Verify user is in the group
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: data.groupId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this group");
  }

  // 2. Find or create category
  let categoryId: string | undefined = undefined;
  if (data.category) {
    let cat = await prisma.category.findFirst({
      where: { name: { equals: data.category, mode: "insensitive" } },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: data.category },
      });
    }
    categoryId = cat.id;
  }

  // 3. Create Expense + Payers + Participants atomically in a single query
  const expense = await prisma.expense.create({
    data: {
      title: data.title,
      amount: data.amount,
      currency: data.currency || "INR",
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      date: data.date ? new Date(data.date) : new Date(),
      paymentMethod: data.paymentMethod,
      merchant: data.merchant,
      description: data.description,
      group: { connect: { id: data.groupId } },
      isGroup: true,
      splitType: data.splitType,
      user: { connect: { id: session.user.id } },
      payers: {
        create: data.payers.map((p) => ({
          userId: p.userId,
          amount: p.amount,
        })),
      },
      participants: {
        create: data.splits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
          percentage: s.percentage,
          shares: s.shares,
        })),
      },
    },
  });

  revalidatePath("/");
  return expense;
}

/**
 * Create a personal expense
 */
export async function createPersonalExpense(data: CreatePersonalExpenseInput) {
  const session = await getCurrentUserSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  let categoryId: string | undefined = undefined;
  if (data.category) {
    let cat = await prisma.category.findFirst({
      where: { name: { equals: data.category, mode: "insensitive" } },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: data.category },
      });
    }
    categoryId = cat.id;
  }

  const expense = await prisma.expense.create({
    data: {
      title: data.title,
      amount: data.amount,
      currency: data.currency || "INR",
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      date: data.date ? new Date(data.date) : new Date(),
      paymentMethod: data.paymentMethod,
      merchant: data.merchant,
      description: data.description,
      isGroup: false,
      user: { connect: { id: userId } },
      payers: {
        create: {
          userId,
          amount: data.amount,
        },
      },
      participants: {
        create: {
          userId,
          amount: data.amount,
        },
      },
    },
  });

  revalidatePath("/");
  return expense;
}

/**
 * Delete expense
 */
export async function deleteExpense(expenseId: string) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  revalidatePath("/");
  return { success: true };
}
