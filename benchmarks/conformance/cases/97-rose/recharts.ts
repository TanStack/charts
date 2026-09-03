import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectRoseData } from './selection'
import { rechartsMount } from '../../shared/recharts-mount'
import type { AlphabetRow } from '@tanstack/charts-data/alphabet'
import type { ConformanceInput } from '../../types'

const colors = [
  '#0369a1',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#c026d3',
  '#db2777',
]
const maximumFrequency = alphabet[0]?.frequency ?? 1

function outerRadius(value: number, radius: number): number {
  return radius * (0.3 + (0.7 * value) / maximumFrequency)
}

function chart(input: ConformanceInput) {
  const data = selectRoseData(alphabet, input.revision)
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
        nameKey: 'letter',
        cx: input.width / 2,
        cy: input.height / 2,
        innerRadius: 0,
        outerRadius: (row: AlphabetRow) => outerRadius(row.frequency, radius),
        startAngle: 90,
        endAngle: -270,
        stroke: '#ffffff',
        strokeWidth: 1,
        isAnimationActive: false,
      },
      data.map((row, index) =>
        createElement(Cell, {
          key: row.letter,
          fill: colors[index],
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ),
    ),
  )
}

export const mount = rechartsMount(chart, 'English letter frequency rose')
