"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserSession } from "./expenses";

/**
 * Fetch budgets and spent progress for the current month
 */
export async function getBudgets(month = new Date().getMonth() + 1, year = new Date().getFullYear()) {
  const session = await getCurrentUserSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  // Fetch defined budgets
  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: true },
  });

  // Calculate spent amount per category for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const expenses = await prisma.expenseParticipant.findMany({
    where: {
      userId,
      expense: {
        date: { gte: startDate, lte: endDate },
      },
    },
    include: {
      expense: {
        include: { category: true },
      },
    },
  });

  const spentByCategory = new Map<string, number>();
  for (const item of expenses) {
    const catName = item.expense.category?.name || "General";
    const current = spentByCategory.get(catName) || 0;
    spentByCategory.set(catName, current + Number(item.amount));
  }

  return budgets.map((b) => ({
    id: b.id,
    category: b.category.name,
    allocatedAmount: Number(b.amount),
    spentAmount: spentByCategory.get(b.category.name) || 0,
    currency: "INR",
    month: `${month}/${year}`,
  }));
}

/**
 * Upsert a category budget
 */
export async function upsertBudget(categoryName: string, amount: number) {
  const session = await getCurrentUserSession();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let cat = await prisma.category.findFirst({
    where: { name: { equals: categoryName, mode: "insensitive" } },
  });

  if (!cat) {
    cat = await prisma.category.create({
      data: { name: categoryName },
    });
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId: cat.id,
        month,
        year,
      },
    },
    update: { amount },
    create: {
      userId,
      categoryId: cat.id,
      amount,
      month,
      year,
    },
  });

  revalidatePath("/");
  return budget;
}
