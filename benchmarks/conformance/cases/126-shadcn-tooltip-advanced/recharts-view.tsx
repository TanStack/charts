import { Bar, BarChart, Tooltip, XAxis } from 'recharts'
import { activityData, weekday, type ActivityDay } from './data'
import { AdvancedTooltipCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

function RechartsTooltipBody({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly {
    dataKey?: string
    value?: number
    payload?: ActivityDay
  }[]
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter(
    (entry) => entry.dataKey === 'running' || entry.dataKey === 'swimming',
  )
  const total = rows.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0)
  return (
    <div
      className="sc-chart-tooltip sc-advanced-tooltip"
      style={{ padding: 8 }}
    >
      {rows.map((entry) => (
        <div className="sc-advanced-row" key={entry.dataKey}>
          <span
            className="sc-advanced-swatch"
            style={{
              background:
                entry.dataKey === 'running'
                  ? 'var(--chart-1)'
                  : 'var(--chart-2)',
            }}
          />
          <span>{entry.dataKey === 'running' ? 'Running' : 'Swimming'}</span>
          <span className="sc-advanced-value">
            {entry.value}
            <span className="sc-advanced-unit">kcal</span>
          </span>
        </div>
      ))}
      <div className="sc-advanced-total">
        Total
        <span className="sc-advanced-value">
          {total}
          <span className="sc-advanced-unit">kcal</span>
        </span>
      </div>
    </div>
  )
}

function RechartsView({ input }: { input: ConformanceInput }) {
  return (
    <AdvancedTooltipCard input={input}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={activityData}
          accessibilityLayer
          aria-label="Daily running and swimming calories"
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: string) => weekday.format(new Date(value))}
          />
          <Bar
            dataKey="running"
            stackId="a"
            fill="var(--chart-1)"
            radius={[0, 0, 4, 4]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="swimming"
            stackId="a"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Tooltip
            cursor={false}
            defaultIndex={1}
            content={<RechartsTooltipBody />}
          />
        </BarChart>
      )}
    </AdvancedTooltipCard>
  )
}

export const rechartsMount = shadcnChartMount(RechartsView)
