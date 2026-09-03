import { createElement } from 'react'
import { Cell, Label, Pie, PieChart } from 'recharts'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectCenterDonutData } from './selection'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const colors = ['#0ea5e9', '#6366f1', '#a855f7']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

function chart(input: ConformanceInput) {
  const data = selectCenterDonutData(alphabet, input.revision)
  const total = data.reduce((sum, row) => sum + row.frequency, 0)
  const outerRadius = Math.min(input.width, input.height) * 0.4

  return createElement(
    PieChart,
    {
      width: input.width,
      height: input.height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      accessibilityLayer: true,
    },
    createElement(
      Pie,
      {
        data,
        dataKey: 'frequency',
        nameKey: 'letter',
        cx: input.width / 2,
        cy: input.height / 2,
        innerRadius: outerRadius * 0.62,
        outerRadius,
        startAngle: 90,
        endAngle: -270,
        stroke: 'none',
        isAnimationActive: false,
      },
      [
        ...data.map((row, index) =>
          createElement(Cell, {
            key: row.letter,
            fill: colors[index],
            stroke: 'none',
          }),
        ),
        createElement(Label, {
          key: 'total',
          value: percentage.format(total),
          position: 'center',
          fill: '#0f172a',
          fontSize: 20,
          fontWeight: 700,
        }),
      ],
    ),
  )
}

export const mount = rechartsMount(chart, 'Letter frequency donut with total')
