import { Bar, BarChart, CartesianGrid, Tooltip, XAxis } from 'recharts'
import { visitorMonths } from './data'
import { BarMultipleCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

function RechartsView({ input }: { input: ConformanceInput }) {
  return (
    <BarMultipleCard input={input}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={visitorMonths}
          accessibilityLayer
          aria-label="Monthly desktop and mobile visitors"
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: string) => value.slice(0, 3)}
          />
          <Tooltip cursor={false} />
          <Bar
            dataKey="desktop"
            fill="var(--chart-1)"
            radius={4}
            isAnimationActive={false}
          />
          <Bar
            dataKey="mobile"
            fill="var(--chart-2)"
            radius={4}
            isAnimationActive={false}
          />
        </BarChart>
      )}
    </BarMultipleCard>
  )
}

export const rechartsMount = shadcnChartMount(RechartsView)
