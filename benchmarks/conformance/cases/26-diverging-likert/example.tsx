import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  barX,
  colorLegend,
  defineChart,
  groupBy,
  ruleX,
  stack,
} from '@tanstack/charts'
import { survey } from '@tanstack/charts-data/survey'
import { scaleBand, scaleLinear } from 'd3-scale'
import { likertResponses, selectLikertSurvey } from './selection'

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

const likertSurvey = selectLikertSurvey(survey)
export const likertCounts = groupBy(likertSurvey, {
  by: { Question: 'Question', Response: 'Response' },
  outputs: { count: { reduce: 'count' } },
})

export const createExampleChart = () =>
  defineChart(
    {
      marks: [
        barX(likertCounts, {
          id: 'likert-responses',
          x: 'count',
          y: 'Question',
          z: 'Response',
          color: 'Response',
          layout: stack({
            order: likertResponses,
            anchor: { series: 'Neutral', fraction: 0.5 },
          }),
          key: (row) => `${row.Question}:${row.Response}`,
          inset: 0.75,
        }),
        ruleX([0], { stroke: '#64748b' }),
      ],
      x: {
        scale: scaleLinear,
        grid: true,
        axis: {
          ticks: { format: (value) => `${Math.abs(value)}` },
          label: '← more disagree · Number of responses · more agree →',
        },
      },
      y: {
        scale: () => scaleBand<string>().paddingInner(0.14).paddingOuter(0.08),
      },
      color: {
        domain: likertResponses,
        range: colors,
        legend: colorLegend({ label: 'Response' }),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )

export const exampleAriaLabel = 'Diverging Likert survey responses'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
