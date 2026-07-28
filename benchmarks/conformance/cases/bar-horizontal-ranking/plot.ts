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
      ariaLabel: 'Horizontal ranking with long labels',
      marginLeft: 220,
      x: {
        domain: categoryTotalDomain,
        nice: false,
        grid: true,
        label: 'Total value',
      },
      y: {
        label: null,
        tickFormat: formatCategory,
      },
      marks: [
        Plot.barX(
          rows,
          Plot.groupY(
            {
              x: 'sum',
            },
            {
              x: 'value',
              y: 'category',
              fill: '#7c3aed',
              inset: 1,
              sort: {
                y: '-x',
              },
            },
          ),
        ),
        Plot.ruleX([0]),
      ],
    })
  })

function formatCategory(value: unknown): string {
  switch (String(value)) {
    case 'Query':
      return 'TanStack Query — async data'
    case 'Router':
      return 'TanStack Router — routing'
    case 'Table':
      return 'TanStack Table — data grids'
    case 'Form':
      return 'TanStack Form — form state'
    case 'Start':
      return 'TanStack Start — full stack'
    case 'Virtual':
      return 'TanStack Virtual — large lists'
    case 'Store':
      return 'TanStack Store — client state'
    case 'DB':
      return 'TanStack DB — reactive data'
    default:
      return String(value)
  }
}
