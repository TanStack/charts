import * as Plot from '@observablehq/plot'
import { regionCollection } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { RegionFeature } from './data'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const collection = regionCollection(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'Regional GeoJSON choropleth',
      projection: {
        type: 'identity',
        domain: collection,
        clip: false,
      },
      marks: [
        Plot.geo(collection, {
          fill: (feature: RegionFeature) => feature.properties.fill,
          stroke: '#f8fafc',
          strokeWidth: 1.5,
        }),
      ],
    })
  })
