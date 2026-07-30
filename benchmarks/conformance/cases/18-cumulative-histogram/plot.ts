import { olympians } from '@charts-poc/demo-data/olympians'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = olympians.slice(nextInput.revision * 8)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Cumulative histogram',
      marginLeft: 44,
      x: { grid: true, label: 'Weight (kg)' },
      y: { grid: true, label: 'Cumulative count' },
      marks: [
        Plot.rectY(rows, {
          ...Plot.binX(
            { y: 'count' },
            {
              x: 'weight',
              cumulative: true,
            },
          ),
          fill: '#2563eb',
        }),
      ],
    })
  })
