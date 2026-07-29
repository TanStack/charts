import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { countryFeatures, equalEarthCountryProjection } from './atlas-data'
import { tanstackMount } from '../../shared/mount'
import type { CountryFeature } from './atlas-data'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    geoShape(countryFeatures(input.revision), {
      key: (country) => country.properties.id,
      projection: ({ chart }) => equalEarthCountryProjection(chart),
      fill: (country: CountryFeature) => country.properties.fill,
      stroke: 'currentColor',
      strokeOpacity: 0.34,
      strokeWidth: 0.55,
    }),
  ],
  x: null,
  y: null,
  guides: false,
  margin: 12,
}))

export const mount = tanstackMount(definition, 'World country choropleth')
