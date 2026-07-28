import * as Plot from '@observablehq/plot'
import { beeswarmData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Beeswarm distribution',
      marginTop: 20,
      marginRight: 20,
      marginBottom: 20,
      marginLeft: 20,
      x: {
        domain: [20, 90],
        axis: null,
      },
      marks: [
        Plot.dot(
          beeswarmData(nextInput.revision),
          Plot.dodgeY(
            {
              anchor: 'middle',
              padding: 1,
            },
            {
              x: 'value',
              r: 4,
              fill: '#0d9488',
              stroke: '#ffffff',
              strokeWidth: 1,
            },
          ),
        ),
      ],
    }),
  )
