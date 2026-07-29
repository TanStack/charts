import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { roseData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { RoseDatum } from './data'
import type { ConformanceInput } from '../../types'

const maximumValue = 100

function outerRadius(value: number, radius: number): number {
  return radius * (0.3 + (0.7 * value) / maximumValue)
}

function chart(input: ConformanceInput) {
  const data = roseData(input.revision)
  const radius = Math.min(input.width, input.height) * 0.4

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
        dataKey: () => 1,
        nameKey: 'label',
        cx: input.width / 2,
        cy: input.height / 2,
        innerRadius: 0,
        outerRadius: (row: RoseDatum) => outerRadius(row.value, radius),
        startAngle: 90,
        endAngle: -270,
        stroke: '#ffffff',
        strokeWidth: 1,
        isAnimationActive: false,
      },
      data.map((row) =>
        createElement(Cell, {
          key: row.id,
          fill: row.fill,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ),
    ),
  )
}

export const mount = rechartsMount(chart, 'Nightingale rose chart')
