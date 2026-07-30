import { survey } from '@charts-poc/demo-data/survey'
import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { agreementPercent, gaugeSegments } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const colors = ['#ef4444', '#e2e8f0']

function chart(input: ConformanceInput) {
  const question = `Q${(input.revision % 2) + 1}`
  const data = gaugeSegments(agreementPercent(survey, question))
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
        innerRadius: outerRadius * 0.72,
        outerRadius,
        startAngle: 225,
        endAngle: -45,
        stroke: 'none',
        isAnimationActive: false,
      },
      data.map((row, index) =>
        createElement(Cell, {
          key: row.id,
          fill: colors[index],
          stroke: 'none',
        }),
      ),
    ),
  )
}

export const mount = rechartsMount(chart, 'Survey agreement share gauge')
