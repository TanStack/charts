import * as Plot from '@observablehq/plot'
import { distributionData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const boundaries = [20, 30, 40, 50, 60, 70, 80, 90]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = distributionData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Histogram of values',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        domain: [20, 90],
        grid: true,
        label: 'Value',
      },
      y: {
        domain: [0, 80],
        grid: true,
        label: 'Count',
      },
      marks: [
        Plot.rectY(rows, {
          ...Plot.binX(
            { y: 'count' },
            {
              x: 'value',
              thresholds: boundaries,
            },
          ),
          fill: '#2563eb',
          inset: 1,
        }),
      ],
    })
  })
