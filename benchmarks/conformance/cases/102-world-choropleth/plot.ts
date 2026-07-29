import * as Plot from '@observablehq/plot'
import { equalEarthProjection, worldRegions } from './geo-data'
import { mountObservablePlot } from '../../shared/mount'
import type { WorldRegion } from './geo-data'
import type { ConformanceMount } from '../../types'

const margin = 10

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'Equal Earth world choropleth',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          equalEarthProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      marks: [
        Plot.geo(worldRegions(nextInput.revision), {
          fill: (feature: WorldRegion) => feature.properties.fill,
          stroke: '#f8fafc',
          strokeWidth: 1,
        }),
      ],
    }),
  )
