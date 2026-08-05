import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { scaleQuantile } from 'd3-scale'
import {
  fitPreviewUnemploymentProjection,
  fitUnemploymentProjection,
  previewUnemploymentStates,
  projectedUnemploymentCounties,
} from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colorRanges = [
  [
    '#f7fbff',
    '#deebf7',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#4292c6',
    '#2171b5',
    '#08519c',
    '#08306b',
  ],
  [
    '#f7fcf5',
    '#e5f5e0',
    '#c7e9c0',
    '#a1d99b',
    '#74c476',
    '#41ab5d',
    '#238b45',
    '#006d2c',
    '#00441b',
  ],
]

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      input.preview
        ? geoShape(previewUnemploymentStates, {
            projection: ({ chart }) => fitPreviewUnemploymentProjection(chart),
            color: (state) => state.properties.rate,
            stroke: '#f8fafc',
            strokeWidth: 0.75,
          })
        : geoShape(projectedUnemploymentCounties, {
            projection: ({ chart }) => fitUnemploymentProjection(chart),
            color: (county) => county.properties.rate,
            stroke: '#f8fafc',
            strokeWidth: 0.35,
          }),
    ],
    color: {
      scale: scaleQuantile<number, string>,
      range: colorRanges[input.revision % 2] ?? colorRanges[0],
    },
    margin: 10,
  })

export const mount = tanstackMount(
  definition,
  'United States county unemployment choropleth',
  {
    format: ({ datum }) =>
      'county' in datum.properties
        ? `${datum.properties.county}, ${datum.properties.state} · ${datum.properties.rate}% unemployment`
        : `${datum.properties.state} · ${datum.properties.rate.toFixed(1)}% average county unemployment`,
  },
)
