"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const BAR_FILLS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(v % 1 === 0 ? 0 : 2);
}

function formatXAxisTick(raw: string, maxLen: number): string {
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 1))}…`;
}

export type BoardChartDatum = { name: string; value: number };

export function BoardBlockChart({
  kind,
  data,
  truncated,
  className,
}: {
  kind: "bar" | "line";
  data: BoardChartDatum[];
  truncated?: boolean;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No categories.</p>
    );
  }

  const n = data.length;
  const crowded = n > 5;
  const xTickMaxLen = crowded ? 10 : 18;
  const bottomMargin = crowded ? 52 : 28;
  const xAngle = crowded ? -32 : 0;

  const margin = {
    top: 10,
    right: 8,
    left: 4,
    bottom: bottomMargin,
  };

  return (
    <div
      className={cn("w-full min-w-0", className)}
      role="img"
      aria-label={`${kind} chart with ${n} categories`}
    >
      <ChartContainer
        config={chartConfig}
        className={cn(
          "h-[min(18rem,42vh)] w-full !aspect-auto sm:h-56",
          className,
        )}
      >
        {kind === "line" ? (
          <LineChart data={data} margin={margin}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/40"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={xAngle}
              textAnchor={crowded ? "end" : "middle"}
              height={bottomMargin + 8}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatXAxisTick(String(v), xTickMaxLen)}
              className="text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatYAxisTick(Number(v))}
              className="tabular-nums text-muted-foreground"
              domain={[0, "auto"]}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2.25}
              dot={{
                r: 3.5,
                fill: "hsl(var(--background))",
                strokeWidth: 2,
                stroke: "var(--color-value)",
              }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={margin} barCategoryGap="18%">
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/40"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={xAngle}
              textAnchor={crowded ? "end" : "middle"}
              height={bottomMargin + 8}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatXAxisTick(String(v), xTickMaxLen)}
              className="text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatYAxisTick(Number(v))}
              className="tabular-nums text-muted-foreground"
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
            >
              {data.map((_, i) => (
                <Cell key={`bar-${i}`} fill={BAR_FILLS[i % BAR_FILLS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartContainer>
      {truncated ? (
        <p className={cn("mt-1.5", theme.typography.monoCaptionMuted)}>
          Partial data (row cap)
        </p>
      ) : null}
    </div>
  );
}
