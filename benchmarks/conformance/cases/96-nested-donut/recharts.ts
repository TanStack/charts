import { flare } from '@tanstack/charts-data/flare'
import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { nestedFlareDonut } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const innerColors = ['#38bdf8', '#8b5cf6']
const outerColors = ['#0284c7', '#0ea5e9', '#7c3aed', '#a855f7']

function chart(input: ConformanceInput) {
  const sourceRows =
    input.revision % 2 === 0
      ? flare
      : flare.filter((row) => row.size === null || row.size >= 1_000)
  const data = nestedFlareDonut(sourceRows)
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
          dataKey: 'size',
          nameKey: 'name',
          cx: input.width / 2,
          cy: input.height / 2,
          innerRadius: radius * 0.12,
          outerRadius: radius * 0.46,
          startAngle: 90,
          endAngle: -270,
          stroke: 'none',
          isAnimationActive: false,
        },
        data.inner.map((row, index) =>
          createElement(Cell, {
            key: row.name,
            fill: innerColors[index],
            stroke: 'none',
          }),
        ),
      ),
      createElement(
        Pie,
        {
          key: 'outer',
          data: data.outer,
          dataKey: 'size',
          nameKey: 'name',
          cx: input.width / 2,
          cy: input.height / 2,
          innerRadius: radius * 0.56,
          outerRadius: radius,
          startAngle: 90,
          endAngle: -270,
          stroke: 'none',
          isAnimationActive: false,
        },
        data.outer.map((row, index) =>
          createElement(Cell, {
            key: row.name,
            fill: outerColors[index],
            stroke: 'none',
          }),
        ),
      ),
    ],
  )
}

export const mount = rechartsMount(chart, 'Nested Flare package sizes')
