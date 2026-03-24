'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import type { AnalysisChartSpec } from '@/lib/analysis/analysis-schemas'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const SERIES_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function buildXYConfig(spec: Extract<AnalysisChartSpec, { type: 'bar' | 'line' | 'area' }>): ChartConfig {
  const config: ChartConfig = { [spec.xKey]: { label: spec.xKey } }
  for (let i = 0; i < spec.yKeys.length; i++) {
    const yk = spec.yKeys[i]!
    config[yk] = {
      label: yk,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }
  }
  return config
}

function formatGanttTick(minStart: number, ms: number) {
  return new Date(minStart + ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

type GanttDatum = {
  label: string
  pad: number
  span: number
  startMs: number
  endMs: number
  __ganttMinStart?: number
}

type Props = {
  spec: AnalysisChartSpec
  data: Record<string, unknown>[]
}

export function AnalysisBlockChart({ spec, data }: Props) {
  const gradPrefix = React.useId().replace(/:/g, '')

  if (data.length === 0) return null

  if (spec.type === 'pie') {
    const numericData = data.map((row) => {
      const out: Record<string, unknown> = { ...row }
      const v = out[spec.valueKey]
      if (typeof v === 'number' && Number.isFinite(v)) out[spec.valueKey] = v
      return out
    })

    const pieConfig: ChartConfig = {
      [spec.valueKey]: { label: spec.valueKey, color: SERIES_COLORS[0] },
    }
    const showLabels = numericData.length <= 8

    return (
      <div className="mt-4 w-full">
        <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[320px] w-full max-w-[320px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey={spec.nameKey} />}
            />
            <Pie
              data={numericData}
              dataKey={spec.valueKey}
              nameKey={spec.nameKey}
              innerRadius={showLabels ? 52 : 44}
              outerRadius={88}
              strokeWidth={1}
              paddingAngle={2}
            >
              {numericData.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="hsl(var(--background))" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    )
  }

  if (spec.type === 'gantt') {
    const ganttData = data as unknown as GanttDatum[]
    const minStart =
      typeof ganttData[0]?.__ganttMinStart === 'number'
        ? ganttData[0].__ganttMinStart
        : Math.min(...ganttData.map((d) => d.startMs))
    const maxX = Math.max(...ganttData.map((d) => d.pad + d.span), 1)

    const ganttConfig: ChartConfig = {
      span: { label: 'Window', color: SERIES_COLORS[0] },
      pad: { label: '', color: 'transparent' },
    }

    const chartHeight = Math.min(520, Math.max(220, ganttData.length * 36 + 72))

    return (
      <div className="mt-4 w-full" style={{ height: chartHeight }}>
        <ChartContainer config={ganttConfig} className="h-full w-full !aspect-auto">
          <BarChart data={ganttData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              type="number"
              domain={[0, maxX]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => formatGanttTick(minStart, v as number)}
              className="text-[10px] tabular-nums text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-[10px] text-muted-foreground"
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as GanttDatum
                if (!row?.startMs || !row?.endMs) return null
                const start = new Date(row.startMs).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
                const end = new Date(row.endMs).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
                return (
                  <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <p className="font-medium text-foreground">{row.label}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {start} — {end}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="pad" stackId="gantt" fill="transparent" isAnimationActive={false} legendType="none" />
            <Bar
              dataKey="span"
              stackId="gantt"
              fill="var(--color-span)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </div>
    )
  }

  const xySpec = spec as Extract<AnalysisChartSpec, { type: 'bar' | 'line' | 'area' }>
  const chartConfig = buildXYConfig(xySpec)

  const numericData = data.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v
      } else {
        out[k] = v
      }
    }
    return out
  })

  const grid = (
    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
  )

  const xAxis = (
    <XAxis
      dataKey={xySpec.xKey}
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      tick={{ fontSize: 11 }}
      className="text-muted-foreground"
    />
  )

  const yAxis = (
    <YAxis
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      width={48}
      tick={{ fontSize: 11 }}
      className="text-muted-foreground tabular-nums"
    />
  )

  const tooltip = (
    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
  )

  if (xySpec.type === 'bar') {
    return (
      <div className="mt-4 h-[300px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
          <BarChart data={numericData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {xySpec.yKeys.map((yk, i) => (
              <Bar
                key={yk}
                dataKey={yk}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    )
  }

  if (xySpec.type === 'area') {
    return (
      <div className="mt-4 h-[300px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
          <AreaChart data={numericData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {xySpec.yKeys.map((yk, i) => {
                const id = `${gradPrefix}-${i}`
                const stroke = SERIES_COLORS[i % SERIES_COLORS.length]
                return (
                  <linearGradient key={yk} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0.08} />
                  </linearGradient>
                )
              })}
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {xySpec.yKeys.map((yk, i) => (
              <Area
                key={yk}
                type="monotone"
                dataKey={yk}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                fill={`url(#${gradPrefix}-${i})`}
                stackId={xySpec.yKeys.length > 1 ? 'a' : undefined}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </div>
    )
  }

  return (
    <div className="mt-4 h-[300px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
        <LineChart data={numericData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {xySpec.yKeys.map((yk, i) => (
            <Line
              key={yk}
              type="monotone"
              dataKey={yk}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
