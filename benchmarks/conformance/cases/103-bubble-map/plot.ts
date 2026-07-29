import * as Plot from '@observablehq/plot'
import {
  equalEarthProjection,
  worldPlaces,
  worldRegions,
} from '../102-world-choropleth/geo-data'
import { mountObservablePlot } from '../../shared/mount'
import type { WorldPlace } from '../102-world-choropleth/geo-data'
import type { ConformanceMount } from '../../types'

const margin = 10

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'Projected proportional-symbol map',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          equalEarthProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      r: {
        type: 'sqrt',
        domain: [0, 100],
        range: [0, 14],
      },
      marks: [
        Plot.geo(worldRegions(nextInput.revision), {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        Plot.geo(worldPlaces(nextInput.revision), {
          r: (feature: WorldPlace) => feature.properties.value,
          fill: (feature: WorldPlace) => feature.properties.fill,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
    }),
  )
