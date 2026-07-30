import { cars } from '@charts-poc/demo-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = cars
      .filter((row) => row['economy (mpg)'] !== null)
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 72)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Beeswarm distribution',
      marginTop: 20,
      marginRight: 20,
      marginBottom: 20,
      marginLeft: 20,
      x: {
        domain: [5, 50],
        axis: null,
      },
      marks: [
        Plot.dot(
          rows,
          Plot.dodgeY(
            {
              anchor: 'middle',
              padding: 1,
            },
            {
              x: 'economy (mpg)',
              r: 4,
              fill: '#0d9488',
              stroke: '#ffffff',
              strokeWidth: 1,
            },
          ),
        ),
      ],
    })
  })
