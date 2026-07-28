import * as Plot from '@observablehq/plot'
import { distributionData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const boundaries = [20, 30, 40, 50, 60, 70, 80, 90]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Cumulative histogram',
      x: { domain: [20, 90], grid: true, label: 'Value' },
      y: { domain: [0, 240], grid: true, label: 'Cumulative count' },
      marks: [
        Plot.rectY(distributionData(nextInput.revision), {
          ...Plot.binX(
            { y: 'count' },
            {
              x: 'value',
              thresholds: boundaries,
              cumulative: true,
            },
          ),
          fill: '#2563eb',
        }),
      ],
    }),
  )
