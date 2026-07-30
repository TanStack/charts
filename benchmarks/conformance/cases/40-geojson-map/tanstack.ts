import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoIdentity } from 'd3-geo'
import { regionCollection } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const collection = regionCollection(input.revision)

    return {
      marks: [
        geoShape(collection.features, {
          key: (feature) => feature.id,
          projection: ({ chart }) =>
            geoIdentity().fitExtent(
              [
                [chart.x, chart.y],
                [chart.x + chart.width, chart.y + chart.height],
              ],
              collection,
            ),
          fill: (feature) => feature.properties.fill,
          stroke: '#f8fafc',
          strokeWidth: 1.5,
        }),
      ],
      x: null,
      y: null,
      guides: false,
      margin: 10,
    }
  })

export const mount = tanstackMount(definition, 'Regional GeoJSON choropleth')
