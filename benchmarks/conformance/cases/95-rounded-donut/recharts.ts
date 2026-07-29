import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { roundedDonutData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  const data = roundedDonutData(input.revision)
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
        dataKey: 'value',
        nameKey: 'label',
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
      data.map((row) =>
        createElement(Cell, {
          key: row.id,
          fill: row.fill,
          stroke: 'none',
        }),
      ),
    ),
  )
}

export const mount = rechartsMount(chart, 'Rounded donut with gaps')
