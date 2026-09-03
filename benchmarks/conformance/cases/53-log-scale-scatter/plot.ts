import { flare } from '@tanstack/charts-data/flare'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = flare
      .filter((row) => row.size !== null)
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 200)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Flare class size on a logarithmic scale',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 50,
      x: {
        type: 'log',
        domain: [200, 30_000],
        grid: true,
        label: 'Class size',
      },
      y: { grid: true, label: 'Hierarchy depth' },
      marks: [
        Plot.dot(rows, {
          x: 'size',
          y: (row) => row.name.split('.').length - 1,
          r: 3.5,
          fill: '#f97316',
          stroke: '#9a3412',
          strokeWidth: 0.75,
        }),
      ],
    })
  })
