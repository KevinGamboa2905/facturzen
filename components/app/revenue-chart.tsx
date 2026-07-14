"use client";

import { useEffect, useState } from "react";
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

// Render a SINGLE chart sized to a visible container. The previous approach
// mounted two charts (one hidden via `sm:hidden`/`hidden sm:block`); the hidden
// one had 0×0 dimensions, which spammed Recharts' "width(0) and height(0)"
// warning. We mount only after the container is measurable, and pick the
// data/height from the viewport — so exactly one, correctly-sized chart exists.
export function RevenueChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    setMounted(true);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const height = isDesktop ? 240 : 200;

  return (
    <div style={{ height }} className="w-full">
      {mounted ? <Chart data={isDesktop ? data : data.slice(-6)} /> : null}
    </div>
  );
}
