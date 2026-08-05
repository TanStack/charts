import { barX, colorLegend, defineChart, ruleX } from '@tanstack/charts'
import { survey } from '@charts-poc/demo-data/survey'
import { scaleBand, scaleLinear } from 'd3-scale'
import { likertResponses, selectLikertSurvey } from './selection'
import { likertSegments } from './transform'
import { tanstackCase } from '../../shared/mount'

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

const likertSurvey = selectLikertSurvey(survey)
const segments = likertSegments(likertSurvey)

const definition = () =>
  defineChart({
    marks: [
      barX(segments, {
        x1: 'x1',
        x2: 'x2',
        y: 'Question',
        color: 'Response',
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
  })

export const catalogCase = tanstackCase(
  definition,
  'Diverging Likert survey responses',
)

export const mount = catalogCase.mount
