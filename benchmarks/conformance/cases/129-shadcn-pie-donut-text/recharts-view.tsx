import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { browserColors, browserData, totalVisitors } from './data'
import { PieDonutTextCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

function RechartsView({ input }: { input: ConformanceInput }) {
  return (
    <PieDonutTextCard input={input}>
      {({ width, height }) => (
        <PieChart
          width={width}
          height={height}
          accessibilityLayer
          aria-label="Browser visitors donut"
        >
          <Tooltip />
          <Pie
            data={browserData}
            dataKey="visitors"
            nameKey="browser"
            innerRadius={60}
            outerRadius={90}
            strokeWidth={5}
            isAnimationActive={false}
          >
            {browserData.map((row, index) => (
              <Cell key={row.browser} fill={browserColors[index]} />
            ))}
          </Pie>
          <text
            className="recharts-text"
            x={width / 2}
            y={height / 2 - 5}
            fill="var(--foreground)"
            fontSize={30}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {totalVisitors.toLocaleString('en-US')}
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
        </PieChart>
      )}
    </PieDonutTextCard>
  )
}

export const rechartsMount = shadcnChartMount(RechartsView)
