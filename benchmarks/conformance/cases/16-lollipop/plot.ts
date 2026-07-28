import * as Plot from '@observablehq/plot'
import { lollipopData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = lollipopData(nextInput.revision)
    const domain = rows.map((row) => row.category)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Ranked lollipop chart',
      x: { domain, label: null },
      y: { domain: [0, 180], grid: true, label: 'Total' },
      marks: [
        Plot.ruleX(rows, {
          x: 'category',
          y: 'value',
          stroke: '#94a3b8',
          strokeWidth: 1.5,
        }),
        Plot.dot(rows, {
          x: 'category',
          y: 'value',
          fill: '#2563eb',
          r: 4,
        }),
      ],
    })
  })
