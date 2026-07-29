import { createElement } from 'react'
import { Cell, Label, Pie, PieChart } from 'recharts'
import { centerDonutData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  const data = centerDonutData(input.revision)
  const total = data.reduce((sum, row) => sum + row.value, 0)
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
        innerRadius: outerRadius * 0.62,
        outerRadius,
        startAngle: 90,
        endAngle: -270,
        stroke: 'none',
        isAnimationActive: false,
      },
      [
        ...data.map((row) =>
          createElement(Cell, {
            key: row.id,
            fill: row.fill,
            stroke: 'none',
          }),
        ),
        createElement(Label, {
          key: 'total',
          value: `${total}k`,
          position: 'center',
          fill: '#0f172a',
          fontSize: 20,
          fontWeight: 700,
        }),
      ],
    ),
  )
}

export const mount = rechartsMount(chart, 'Donut with center total')
