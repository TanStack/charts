import { alphabet } from '@charts-poc/demo-data/alphabet'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Ranked lollipop chart',
      x: { label: null },
      y: { grid: true, label: 'Frequency', percent: true },
      marks: [
        Plot.ruleX(alphabet, {
          x: 'letter',
          y: 'frequency',
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          sort: { x: '-y' },
        }),
        Plot.dot(alphabet, {
          x: 'letter',
          y: 'frequency',
          fill: '#2563eb',
          r: 4,
          sort: { x: '-y' },
        }),
      ],
    })
  })
