import * as Plot from '@observablehq/plot'
import { albersUsaProjection, usStates } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { UsState } from './data'
import type { ConformanceMount } from '../../types'

const margin = 10

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'United States state choropleth',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          albersUsaProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      marks: [
        Plot.geo(usStates(nextInput.revision), {
          fill: (state: UsState) => state.properties.fill,
          stroke: '#f8fafc',
          strokeWidth: 0.75,
        }),
      ],
    }),
  )
