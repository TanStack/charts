import * as Plot from '@observablehq/plot'
import { westportHouse } from '@charts-poc/demo-data/westport-house'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const strokes = ['#1e293b', '#2563eb']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'Westport House floor plan',
      projection: {
        type: 'identity',
        domain: westportHouse,
        clip: false,
      },
      marks: [
        Plot.geo(westportHouse, {
          fill: 'none',
          stroke: strokes[nextInput.revision % 2] ?? strokes[0],
          strokeWidth: 1,
        }),
      ],
    }),
  )
