"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
  type PieSectorShapeProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ExpenseItem {
  id: string;
  amount: number;
  category?: string;
}

interface CategoryBreakdownChartProps {
  expenses: ExpenseItem[];
  currencySymbol?: string;
}

const MONO_SHADES = [
  "var(--foreground)",
  "oklch(0.45 0 0)",
  "oklch(0.60 0 0)",
  "oklch(0.75 0 0)",
  "oklch(0.30 0 0)",
  "oklch(0.85 0 0)",
];

export function CategoryBreakdownChart({
  expenses = [],
  currencySymbol = "₹",
}: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    expenses.forEach((exp) => {
      const cat = exp.category || "General";
      map.set(cat, (map.get(cat) || 0) + Number(exp.amount || 0));
    });

    const entries = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    if (entries.length === 0) {
      return [];
    }

    return entries.sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalValue = useMemo(
    () => categoryData.reduce((sum, item) => sum + item.value, 0),
    [categoryData]
  );

  const renderShape = (props: PieSectorShapeProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, isActive, index } = props;
    const isHighlighted = isActive || (activeIndex !== undefined && activeIndex === index);
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={isHighlighted ? Number(innerRadius) - 2 : innerRadius}
          outerRadius={isHighlighted ? Number(outerRadius) + 5 : outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">Category Distribution</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Proportional spending by category
        </CardDescription>
      </CardHeader>

      <CardContent>
        {categoryData.length === 0 ? (
          <div className="h-[210px] w-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-medium text-muted-foreground">No category data yet</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add expenses to see your category breakdown
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-[210px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const percent = totalValue ? ((Number(data.value) / totalValue) * 100).toFixed(1) : "0";
                        return (
                          <div className="rounded-lg border border-border bg-popover/95 p-2 shadow-md backdrop-blur-md text-xs">
                            <p className="font-semibold text-foreground">{data.name}</p>
                            <p className="text-primary font-bold">
                              {currencySymbol}
                              {Number(data.value).toLocaleString()} ({percent}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    shape={renderShape}
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    animationDuration={800}
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MONO_SHADES[index % MONO_SHADES.length]}
                        className="transition-all duration-200 outline-none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Statistic */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {activeIndex !== undefined ? categoryData[activeIndex]?.name : "Total"}
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground">
                  {currencySymbol}
                  {activeIndex !== undefined
                    ? categoryData[activeIndex]?.value.toLocaleString()
                    : totalValue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-3 space-y-1.5 pt-3 border-t border-border/40">
              {categoryData.slice(0, 4).map((cat, idx) => {
                const percent = totalValue ? Math.round((cat.value / totalValue) * 100) : 0;
                return (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    className={`flex items-center justify-between text-xs p-1 rounded-md cursor-pointer transition-colors ${
                      activeIndex === idx ? "bg-muted font-medium" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: MONO_SHADES[idx % MONO_SHADES.length] }}
                      />
                      <span className="truncate text-muted-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-foreground">
                        {currencySymbol}
                        {cat.value.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
