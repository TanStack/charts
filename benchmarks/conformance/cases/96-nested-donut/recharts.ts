import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { nestedDonutData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  const data = nestedDonutData(input.revision)
  const radius = Math.min(input.width, input.height) * 0.4

  return createElement(
    PieChart,
    {
      width: input.width,
      height: input.height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      accessibilityLayer: true,
    },
    [
      createElement(
        Pie,
        {
          key: 'inner',
          data: data.inner,
          dataKey: 'value',
          nameKey: 'label',
          cx: input.width / 2,
          cy: input.height / 2,
          innerRadius: radius * 0.12,
          outerRadius: radius * 0.46,
          startAngle: 90,
          endAngle: -270,
          stroke: 'none',
          isAnimationActive: false,
        },
        data.inner.map((row) =>
          createElement(Cell, {
            key: row.id,
            fill: row.fill,
            stroke: 'none',
          }),
        ),
      ),
      createElement(
        Pie,
        {
          key: 'outer',
          data: data.outer,
          dataKey: 'value',
          nameKey: 'label',
          cx: input.width / 2,
          cy: input.height / 2,
          innerRadius: radius * 0.56,
          outerRadius: radius,
          startAngle: 90,
          endAngle: -270,
          stroke: 'none',
          isAnimationActive: false,
        },
        data.outer.map((row) =>
          createElement(Cell, {
            key: row.id,
            fill: row.fill,
            stroke: 'none',
          }),
        ),
      ),
    ],
  )
}

export const mount = rechartsMount(chart, 'Nested donut rings')
