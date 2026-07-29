import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { equalEarthProjection, worldRegions } from './geo-data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    geoShape(worldRegions(input.revision), {
      key: (feature) => feature.properties.id,
      projection: ({ chart }) => equalEarthProjection(chart),
      fill: (feature) => feature.properties.fill,
      stroke: '#f8fafc',
      strokeWidth: 1,
    }),
  ],
  x: null,
  y: null,
  guides: false,
  margin: 10,
}))

export const mount = tanstackMount(definition, 'Equal Earth world choropleth', {
  format: ({ datum }) =>
    `${datum.properties.name} · Regional value ${datum.properties.value}`,
})
