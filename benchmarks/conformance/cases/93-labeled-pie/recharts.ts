import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { selectLabeledPieData } from './selection'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { PieLabelRenderProps } from 'recharts'

const radiusRatio = 0.56
const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']

function renderLabel({ name }: PieLabelRenderProps): string {
  return String(name ?? '')
}

function chart(input: ConformanceInput) {
  const data = selectLabeledPieData(alphabet, input.revision)
  const radius = (Math.min(input.width, input.height) / 2) * radiusRatio

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
        innerRadius: 0,
        outerRadius: radius,
        startAngle: 90,
        endAngle: -270,
        label: renderLabel,
        labelLine: {
          stroke: '#94a3b8',
          strokeWidth: 1,
        },
        fontSize: 12,
        fontWeight: 500,
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

export const mount = rechartsMount(chart, 'Letter frequency pie with labels')
