"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BudgetItem {
  category: string;
  budget: number;
  spent: number;
}

interface BudgetProgressChartProps {
  budgets?: BudgetItem[];
  currencySymbol?: string;
}

export function BudgetProgressChart({
  budgets = [],
  currencySymbol = "₹",
}: BudgetProgressChartProps) {
  const data: BudgetItem[] = budgets;

  return (
    <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">Budget vs. Actual</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Monthly expenditure threshold monitoring
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="h-[210px] w-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-medium text-muted-foreground">No budgets configured</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Set monthly category budgets in the Budgets tab
            </p>
          </div>
        ) : (
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(val) => `${currencySymbol}${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as BudgetItem;
                    const percent = Math.round((item.spent / item.budget) * 100);
                    const isOver = item.spent > item.budget;
                    return (
                      <div className="rounded-lg border border-border bg-popover/95 p-2.5 shadow-md backdrop-blur-md text-xs space-y-1">
                        <p className="font-semibold text-foreground">{item.category}</p>
                        <p className="text-muted-foreground">
                          Budget: {currencySymbol}{item.budget.toLocaleString()}
                        </p>
                        <p className={`font-semibold ${isOver ? "text-rose-500" : "text-primary"}`}>
                          Spent: {currencySymbol}{item.spent.toLocaleString()} ({percent}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                name="Budget Limit"
                dataKey="budget"
                fill="var(--muted)"
                stroke="var(--border)"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Bar
                name="Current Spent"
                dataKey="spent"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
