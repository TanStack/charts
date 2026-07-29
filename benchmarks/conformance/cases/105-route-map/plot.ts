import * as Plot from '@observablehq/plot'
import {
  equalEarthProjection,
  worldCollection,
} from '../102-world-choropleth/geo-data'
import { routePlaces, worldRoutes } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { WorldPlace, WorldRoute } from '../102-world-choropleth/geo-data'
import type { ConformanceMount } from '../../types'

const margin = 10

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'Great-circle route map',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          equalEarthProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      marks: [
        Plot.geo([worldCollection(nextInput.revision)], {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
        Plot.geo(worldRoutes(nextInput.revision), {
          fill: 'none',
          stroke: (feature: WorldRoute) => feature.properties.stroke,
          strokeWidth: 2,
          strokeOpacity: 0.9,
        }),
        Plot.geo(routePlaces(nextInput.revision), {
          r: 3.5,
          fill: (feature: WorldPlace) => feature.properties.fill,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
    }),
  )
