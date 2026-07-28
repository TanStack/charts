import * as Plot from '@observablehq/plot'
import { likertData, likertQuestions, likertResponses } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Diverging Likert survey responses',
      marginLeft: 104,
      x: {
        domain: [-40, 80],
        grid: true,
        label: 'Share of responses',
        tickFormat: (value) => `${Math.abs(Number(value))}%`,
      },
      y: {
        domain: likertQuestions,
        label: null,
      },
      color: {
        domain: likertResponses,
        range: colors,
        legend: true,
      },
      marks: [
        Plot.barX(
          likertData(nextInput.revision),
          Plot.stackX({
            x: 'signedValue',
            y: 'question',
            z: 'response',
            fill: 'response',
            order: [...likertResponses],
            inset: 0.75,
          }),
        ),
        Plot.ruleX([0], { stroke: '#64748b' }),
      ],
    }),
  )
