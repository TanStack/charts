import { cars } from '@charts-poc/demo-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceMount } from '../../types'

type CompleteCar = CarsRow & {
  'power (hp)': number
  'economy (mpg)': number
}

const completeCars = cars.filter(
  (row): row is CompleteCar =>
    row['power (hp)'] !== null && row['economy (mpg)'] !== null,
)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = completeCars.slice(
      nextInput.revision * 8,
      nextInput.revision * 8 + 320,
    )
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Scatterplot with linear regression',
      x: { grid: true, label: 'Power (hp)' },
      y: { grid: true, label: 'Fuel economy (mpg)' },
      marks: [
        Plot.dot(rows, {
          x: 'power (hp)',
          y: 'economy (mpg)',
          fill: '#93c5fd',
          stroke: '#2563eb',
          r: 3,
        }),
        Plot.linearRegressionY(rows, {
          x: 'power (hp)',
          y: 'economy (mpg)',
          ci: 0,
          stroke: '#dc2626',
          strokeWidth: 2,
        }),
      ],
    })
  })
