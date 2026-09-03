import { cars } from '@tanstack/charts-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const boundaries = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = cars
      .filter((row) => row['economy (mpg)'] !== null)
      .slice(nextInput.revision * 8)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Histogram of values',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        domain: [5, 50],
        grid: true,
        label: 'Fuel economy (mpg)',
      },
      y: {
        grid: true,
        label: 'Count',
      },
      marks: [
        Plot.rectY(rows, {
          ...Plot.binX(
            { y: 'count' },
            {
              x: 'economy (mpg)',
              thresholds: boundaries,
            },
          ),
          fill: '#2563eb',
          inset: 1,
        }),
      ],
    })
  })
