import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { scaleSqrt } from 'd3-scale'
import {
  equalEarthProjection,
  worldPlaces,
  worldRegions,
} from '../102-world-choropleth/geo-data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const radius = scaleSqrt().domain([0, 100]).range([0, 14])

const definition = (input: ConformanceInput) =>
  defineChart(() => ({
    marks: [
      geoShape(worldRegions(input.revision), {
        key: (feature) => feature.properties.id,
        projection: ({ chart }) => equalEarthProjection(chart),
        fill: '#e2e8f0',
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      geoShape(worldPlaces(input.revision), {
        key: (feature) => feature.properties.id,
        projection: ({ chart }) => equalEarthProjection(chart),
        r: (feature) => feature.properties.value,
        rScale: radius,
        fill: (feature) => feature.properties.fill,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 10,
  }))

export const mount = tanstackMount(
  definition,
  'Projected proportional-symbol map',
  {
    format: ({ datum }) =>
      datum.geometry.type === 'Point'
        ? `${datum.properties.name} · Magnitude ${datum.properties.value}`
        : `${datum.properties.name} · Regional value ${datum.properties.value}`,
  },
)
