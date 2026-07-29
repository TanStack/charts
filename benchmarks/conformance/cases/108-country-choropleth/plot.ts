import * as Plot from '@observablehq/plot'
import { countryFeatures, equalEarthCountryProjection } from './atlas-data'
import { mountObservablePlot } from '../../shared/mount'
import type { CountryFeature } from './atlas-data'
import type { ConformanceMount } from '../../types'

const margin = 12

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'World country choropleth',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          equalEarthCountryProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      marks: [
        Plot.geo(countryFeatures(nextInput.revision), {
          fill: (country: CountryFeature) => country.properties.fill,
          stroke: 'currentColor',
          strokeOpacity: 0.34,
          strokeWidth: 0.55,
        }),
      ],
    }),
  )
