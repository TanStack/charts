import { citywages } from '@charts-poc/demo-data/citywages'
import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = citywages.slice(
      nextInput.revision * 4,
      nextInput.revision * 4 + 8,
    )

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Horizontal ranking with long labels',
      marginLeft: 220,
      marginRight: 56,
      x: {
        grid: true,
        label: '2015 population',
      },
      y: {
        label: null,
      },
      marks: [
        Plot.barX(rows, {
          x: 'POP_2015',
          y: 'Metro',
          fill: '#7c3aed',
          inset: 1,
          sort: {
            y: '-x',
          },
        }),
        Plot.ruleX([0]),
      ],
    })
  })
