import * as Plot from '@observablehq/plot'
import { boxData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Grouped boxplots',
      x: { domain: ['Alpha', 'Beta', 'Gamma'], label: null },
      y: { domain: [10, 100], grid: true, label: 'Value' },
      marks: [
        Plot.boxY(boxData(nextInput.revision), {
          x: 'group',
          y: 'value',
          fill: '#bfdbfe',
          stroke: '#2563eb',
        }),
      ],
    }),
  )
