import { forwardRef } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import {
  dashboardChartWidth,
  dashboardTickValues,
  ShadcnDashboard,
  type DashboardChartProps,
} from './dashboard'
import { formatDashboardDate } from './data'
import { reactMount } from '../../shared/react-mount'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

function RechartsDashboardChart({ data, input }: DashboardChartProps) {
  const width = dashboardChartWidth(input.width)
  const tickValues = dashboardTickValues(data, width)

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      initialDimension={{
        width,
        height: 250,
      }}
    >
      <AreaChart
        accessibilityLayer
        data={[...data]}
        role="img"
        aria-label="Total visitors for the last three months"
      >
        <defs>
          <linearGradient id="shadcn-fill-desktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--sd-primary)" stopOpacity={1} />
            <stop
              offset="95%"
              stopColor="var(--sd-primary)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="shadcn-fill-mobile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--sd-primary)" stopOpacity={0.8} />
            <stop
              offset="95%"
              stopColor="var(--sd-primary)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--sd-border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          ticks={[...tickValues]}
          tick={{ fill: 'var(--sd-muted-foreground)', fontSize: 12 }}
          tickFormatter={formatDashboardDate}
        />
        <Tooltip
          cursor={false}
          separator=": "
          labelFormatter={(value) =>
            typeof value === 'string' || typeof value === 'number'
              ? formatDashboardDate(value)
              : ''
          }
          formatter={(value, name) => [
            Number(value).toLocaleString('en-US'),
            name === 'desktop' ? 'Desktop' : 'Mobile',
          ]}
          contentStyle={{
            minWidth: 138,
            padding: '8px 10px',
            border: '1px solid var(--sd-border)',
            borderRadius: 8,
            color: 'var(--sd-card-foreground)',
            background: 'var(--sd-card)',
            boxShadow: '0 2px 6px rgb(0 0 0 / 8%)',
            fontSize: 12,
            lineHeight: 1.45,
          }}
          labelStyle={{ color: 'var(--sd-card-foreground)', fontWeight: 500 }}
          itemStyle={{ color: 'var(--sd-card-foreground)', padding: 0 }}
        />
        <Area
          dataKey="mobile"
          type="natural"
          fill="url(#shadcn-fill-mobile)"
          stroke="var(--sd-primary)"
          stackId="a"
          isAnimationActive={false}
        />
        <Area
          dataKey="desktop"
          type="natural"
          fill="url(#shadcn-fill-desktop)"
          stroke="var(--sd-primary)"
          stackId="a"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const RechartsDashboardView = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function RechartsDashboardView({ input }, ref) {
  return (
    <ShadcnDashboard
      ref={ref}
      ChartRenderer={RechartsDashboardChart}
      input={input}
    />
  )
})

export const mount = reactMount(RechartsDashboardView)
