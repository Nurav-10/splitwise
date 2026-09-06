"use client";

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  date?: string;
  category?: string;
}

interface SpendingTrendChartProps {
  expenses: ExpenseItem[];
  currencySymbol?: string;
}

type TimeRange = "7D" | "30D" | "3M" | "ALL";

export function SpendingTrendChart({
  expenses = [],
  currencySymbol = "₹",
}: SpendingTrendChartProps) {
  const [range, setRange] = useState<TimeRange>("30D");

  const chartData = useMemo(() => {
    // Generate dates based on range
    const days = range === "7D" ? 7 : range === "30D" ? 30 : range === "3M" ? 90 : 180;
    const now = new Date();
    const map = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map.set(key, 0);
    }

    // Populate with real expense data if available
    expenses.forEach((exp) => {
      let dateKey = "";
      if (exp.date) {
        // Try parsing date string
        const parsed = new Date(exp.date);
        if (!isNaN(parsed.getTime())) {
          dateKey = parsed.toISOString().split("T")[0];
        }
      }
      if (!dateKey) {
        dateKey = now.toISOString().split("T")[0];
      }
      if (map.has(dateKey)) {
        map.set(dateKey, (map.get(dateKey) || 0) + Number(exp.amount || 0));
      }
    });

    const entries = Array.from(map.entries()).map(([dateStr, amount]) => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: dateStr,
        label,
        amount: Math.round(amount),
      };
    });

    return entries;
  }, [expenses, range]);

  const totalSpent = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.amount, 0),
    [chartData]
  );

  const avgDaily = useMemo(
    () => (chartData.length ? Math.round(totalSpent / chartData.length) : 0),
    [totalSpent, chartData]
  );

  const maxPoint = useMemo(
    () => Math.max(...chartData.map((d) => d.amount), 100),
    [chartData]
  );

  return (
    <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold tracking-tight">Spending Analytics</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Live Recharts
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Daily expense volume & transaction momentum
          </CardDescription>
        </div>

        {/* Time range pills */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 text-xs">
          {(["7D", "30D", "3M", "ALL"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all ${
                range === r
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex items-baseline gap-4 mb-4 pb-2 border-b border-border/40">
          <div>
            <span className="text-xs text-muted-foreground block">Period Total</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              {currencySymbol}
              {totalSpent.toLocaleString()}
            </span>
          </div>
          <div className="border-l border-border/60 pl-4">
            <span className="text-xs text-muted-foreground block">Daily Avg</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {currencySymbol}
              {avgDaily.toLocaleString()}/day
            </span>
          </div>
          <div className="border-l border-border/60 pl-4 hidden sm:block">
            <span className="text-xs text-muted-foreground block">Peak Day</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {currencySymbol}
              {maxPoint.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="h-[220px] sm:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="monoSpendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="85%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-popover/95 p-2.5 shadow-md backdrop-blur-md text-xs">
                        <p className="font-semibold text-foreground text-[11px] mb-1">{data.date}</p>
                        <p className="text-primary font-bold text-sm">
                          {currencySymbol}
                          {data.amount.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={2.2}
                fill="url(#monoSpendGradient)"
                animationDuration={800}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                  fill: "var(--primary)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
