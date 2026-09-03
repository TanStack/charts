import * as Plot from '@observablehq/plot'
import { survey } from '@tanstack/charts-data/survey'
import { likertResponses, selectLikertSurvey } from './selection'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']
const likertSurvey = selectLikertSurvey(survey)
const responseDirection = new Map([
  ['Strongly Disagree', -1],
  ['Disagree', -1],
  ['Neutral', 0],
  ['Agree', 1],
  ['Strongly Agree', 1],
])
const likertOffset: Plot.StackOffset = (facetStacks, x1, x2, z) => {
  for (const stacks of facetStacks) {
    for (const stack of stacks) {
      let shift = 0
      for (const index of stack) {
        shift +=
          (((x2[index] ?? 0) - (x1[index] ?? 0)) *
            (1 - (responseDirection.get(String(z[index])) ?? 0))) /
          2
      }
      for (const index of stack) {
        x1[index] = (x1[index] ?? 0) - shift
        x2[index] = (x2[index] ?? 0) - shift
      }
    }
  }
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Diverging Likert survey responses',
      marginLeft: 104,
      x: {
        grid: true,
        label: '← more disagree · Number of responses · more agree →',
        tickFormat: Math.abs,
      },
      y: { label: null },
      color: {
        domain: likertResponses,
        range: colors,
        legend: true,
      },
      marks: [
        Plot.barX(
          likertSurvey,
          Plot.groupY(
            { x: 'count' },
            {
              y: 'Question',
              fill: 'Response',
              order: [...likertResponses],
              offset: likertOffset,
              inset: 0.75,
            },
          ),
        ),
        Plot.ruleX([0], { stroke: '#64748b' }),
      ],
    }),
  )
