import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Tooltip } from 'recharts'
import { radarData } from './data'
import { RadarMultipleCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

function RechartsView({ input }: { input: ConformanceInput }) {
  const compactLabels = input.width < 350
  return (
    <RadarMultipleCard input={input}>
      {({ width, height }) => (
        <RadarChart
          width={width}
          height={height}
          data={radarData}
          accessibilityLayer
          aria-label="Desktop and mobile visitor radar"
        >
          <Tooltip cursor={false} />
          <PolarAngleAxis
            dataKey="month"
            tickFormatter={
              compactLabels ? (value: string) => value.slice(0, 3) : undefined
            }
          />
          <PolarGrid />
          <Radar
            dataKey="desktop"
            fill="var(--chart-1)"
            fillOpacity={0.6}
            isAnimationActive={false}
          />
          <Radar
            dataKey="mobile"
            fill="var(--chart-2)"
            isAnimationActive={false}
          />
        </RadarChart>
      )}
    </RadarMultipleCard>
  )
}

export const rechartsMount = shadcnChartMount(RechartsView)
