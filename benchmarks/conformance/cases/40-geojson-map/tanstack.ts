import { westportHouse } from '@charts-poc/demo-data/westport-house'
import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoIdentity } from 'd3-geo'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const strokes = ['#1e293b', '#2563eb']

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      geoShape(westportHouse.features, {
        key: (feature) => feature.properties.id,
        projection: {
          type: geoIdentity,
          fit: westportHouse,
        },
        fill: 'none',
        stroke: strokes[input.revision % 2] ?? strokes[0],
        strokeWidth: 1,
      }),
    ],
    margin: 10,
  })

export const mount = tanstackMount(definition, 'Westport House floor plan', {
  format: ({ datum }) =>
    datum.properties.name ??
    datum.properties.roomnumber ??
    datum.properties.type.replaceAll('_', ' '),
})
