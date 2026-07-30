import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { albersUsaProjection, usStates } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => ({
    marks: [
      geoShape(usStates(input.revision), {
        key: (state) => state.properties.id,
        projection: ({ chart }) => albersUsaProjection(chart),
        fill: (state) => state.properties.fill,
        stroke: '#f8fafc',
        strokeWidth: 0.75,
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 10,
  }))

export const mount = tanstackMount(definition, 'United States state choropleth')
