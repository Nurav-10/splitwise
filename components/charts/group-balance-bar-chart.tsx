"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface BalanceItem {
  name: string;
  net: number;
}

interface GroupBalanceBarChartProps {
  balances?: BalanceItem[];
  currencySymbol?: string;
  groupTitle?: string;
}

export function GroupBalanceBarChart({
  balances = [],
  currencySymbol = "₹",
  groupTitle = "Group Settlement Status",
}: GroupBalanceBarChartProps) {
  const data = balances;

  return (
    <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          {groupTitle}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Net balance position per member (+ Owed, - Owes)
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="h-[210px] w-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-medium text-muted-foreground">
              No member balances
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add group expenses to track who owes whom
            </p>
          </div>
        ) : (
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
                <XAxis
                  dataKey="name"
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
                  tickFormatter={(val) => `${val > 0 ? "+" : ""}${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as BalanceItem;
                      const isPositive = item.net >= 0;
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 p-2 shadow-md backdrop-blur-md text-xs">
                          <p className="font-semibold text-foreground">
                            {item.name}
                          </p>
                          <p
                            className={`font-bold ${
                              isPositive ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {isPositive
                              ? `Gets back: ${currencySymbol}${item.net}`
                              : `Owes: ${currencySymbol}${Math.abs(item.net)}`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="net"
                  radius={[4, 4, 4, 4]}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={
                        entry.net > 0
                          ? "oklch(0.65 0.18 150)" // subtle emerald
                          : entry.net < 0
                            ? "oklch(0.60 0.18 25)" // subtle rose
                            : "var(--muted-foreground)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
