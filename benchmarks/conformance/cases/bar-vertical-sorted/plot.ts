import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { categoryData, categoryTotalDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = categoryData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Sorted vertical bars',
      x: {
        label: null,
      },
      y: {
        domain: categoryTotalDomain,
        nice: false,
        grid: true,
        label: 'Total value',
      },
      marks: [
        Plot.barY(
          rows,
          Plot.groupX(
            {
              y: 'sum',
            },
            {
              x: 'category',
              y: 'value',
              fill: '#2563eb',
              inset: 1,
              sort: {
                x: '-y',
              },
            },
          ),
        ),
      ],
    })
  })
