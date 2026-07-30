import { cars } from '@charts-poc/demo-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = cars
      .filter(
        (row) => row['economy (mpg)'] !== null && row['power (hp)'] !== null,
      )
      .slice(nextInput.revision * 3, nextInput.revision * 3 + 24)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Delaunay spatial network',
      x: { grid: true, label: 'Weight (lb)' },
      y: { grid: true, label: 'Fuel economy (mpg)' },
      marks: [
        Plot.delaunayLink(rows, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          ariaLabel: 'link',
          stroke: '#94a3b8',
          strokeOpacity: 0.75,
          strokeWidth: 1,
        }),
        Plot.dot(rows, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
      ],
    })
  })
