import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoAlbersUsa } from 'd3-geo'
import { scaleQuantile } from 'd3-scale'
import {
  previewUnemploymentStateCollection,
  previewUnemploymentStates,
  projectedUnemploymentCounties,
  unemploymentCountyCollection,
} from './transform'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import type { UnemploymentCounty, UnemploymentState } from './transform'
import type { ExtendedFeatureCollection } from 'd3-geo'
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

export const usStateChoroplethDefinition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      geoShape(projectedUnemploymentCounties, {
        projection: {
          type: geoAlbersUsa,
          fit: unemploymentCountyCollection,
        },
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

type CatalogUnemploymentFeature = UnemploymentCounty | UnemploymentState

const catalogChoroplethDefinition = (input: ConformanceInput) => {
  const features: readonly CatalogUnemploymentFeature[] =
    input.preview === true
      ? previewUnemploymentStates
      : projectedUnemploymentCounties
  const fit: ExtendedFeatureCollection<CatalogUnemploymentFeature> =
    input.preview === true
      ? previewUnemploymentStateCollection
      : unemploymentCountyCollection

  return defineChart({
    marks: [
      geoShape(features, {
        projection: { type: geoAlbersUsa, fit },
        color: (feature) => feature.properties.rate,
        stroke: '#f8fafc',
        strokeWidth: input.preview === true ? 0.75 : 0.35,
      }),
    ],
    color: {
      scale: scaleQuantile<number, string>,
      range: colorRanges[input.revision % 2] ?? colorRanges[0],
    },
    margin: 10,
  })
}

export const mount = tanstackMount(
  usStateChoroplethDefinition,
  'United States county unemployment choropleth',
  {
    format: ({ datum }) =>
      `${datum.properties.county}, ${datum.properties.state} · ${datum.properties.rate}% unemployment`,
  },
)

export const catalogCase = tanstackCase(
  catalogChoroplethDefinition,
  mount.ariaLabel,
  {
    format: ({ datum }) =>
      'county' in datum.properties
        ? `${datum.properties.county}, ${datum.properties.state} · ${datum.properties.rate}% unemployment`
        : `${datum.properties.state} · ${datum.properties.rate.toFixed(1)}% average county unemployment`,
  },
)
