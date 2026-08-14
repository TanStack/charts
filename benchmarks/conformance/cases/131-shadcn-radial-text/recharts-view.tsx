import { PolarGrid, RadialBar, RadialBarChart } from 'recharts'
import { radialData } from './data'
import { RadialTextCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

function RechartsView({ input }: { input: ConformanceInput }) {
  return (
    <RadialTextCard input={input}>
      {({ width, height }) => (
        <RadialBarChart
          width={width}
          height={height}
          data={radialData}
          startAngle={0}
          endAngle={250}
          outerRadius={90}
          innerRadius={80}
          accessibilityLayer
          aria-label="Safari visitors radial chart"
        >
          <PolarGrid
            gridType="circle"
            radialLines={false}
            stroke="none"
            polarRadius={[90, 80]}
            fill="var(--muted)"
          />
          <RadialBar
            dataKey="visitors"
            fill="var(--chart-2)"
            background={{ fill: 'var(--muted)' }}
            cornerRadius={10}
            isAnimationActive={false}
          />
          <text
            className="recharts-text"
            x={width / 2}
            y={height / 2 - 5}
            fill="var(--foreground)"
            fontSize={36}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            200
          </text>
          <text
            className="recharts-text"
            x={width / 2}
            y={height / 2 + 19}
            fill="var(--muted-foreground)"
            fontSize={14}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Visitors
          </text>
        </RadialBarChart>
      )}
    </RadialTextCard>
  )
}

export const rechartsMount = shadcnChartMount(RechartsView)
