import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectRoundedDonutData } from './selection'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const colors = ['#0284c7', '#4f46e5', '#9333ea', '#db2777', '#ea580c']

function chart(input: ConformanceInput) {
  const data = selectRoundedDonutData(alphabet, input.revision)
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
        innerRadius: outerRadius * 0.58,
        outerRadius,
        startAngle: 90,
        endAngle: -270,
        paddingAngle: 3,
        cornerRadius: 8,
        stroke: 'none',
        isAnimationActive: false,
      },
      data.map((row, index) =>
        createElement(Cell, {
          key: row.letter,
          fill: colors[index],
          stroke: 'none',
        }),
      ),
    ),
  )
}

export const mount = rechartsMount(chart, 'Rounded letter frequency donut')
