"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { formatAmount } from "@/lib/money";

type Point = { label: string; total: number };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="capitalize text-muted-foreground">{point.label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">
        {formatAmount(point.total)}
      </p>
    </div>
  );
}

function Chart({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          className="capitalize"
          interval={0}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip />} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill="var(--foreground)"
              fillOpacity={d.total >= max ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <>
      {/* Desktop: 12 months */}
      <div className="hidden h-[240px] w-full sm:block">
        <Chart data={data} />
      </div>
      {/* Mobile: last 6 months, simplified */}
      <div className="h-[200px] w-full sm:hidden">
        <Chart data={data.slice(-6)} />
      </div>
    </>
  );
}
