import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleQuantize } from 'd3-scale'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import { learningPovertyCountries } from '../../shared/transforms/learning-poverty'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colorRanges = [
  ['#ecfeff', '#a5f3fc', '#67e8f9', '#06b6d4', '#0e7490', '#164e63'],
  ['#f0fdf4', '#bbf7d0', '#86efac', '#22c55e', '#15803d', '#14532d'],
]
const projection = {
  type: geoEqualEarth,
  fit: 'sphere' as const,
}

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      geoShape([worldLand], {
        projection,
        fill: '#e2e8f0',
        stroke: '#ffffff',
        strokeWidth: 0.55,
      }),
      geoShape(learningPovertyCountries, {
        projection,
        color: (country) => country.properties.density,
        stroke: 'currentColor',
        strokeOpacity: 0.34,
        strokeWidth: 0.55,
      }),
      geoShape([worldSphere], {
        projection,
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.35,
        strokeWidth: 0.75,
      }),
    ],
    color: {
      scale: scaleQuantize<string>,
      range: colorRanges[input.revision % 2] ?? colorRanges[0],
    },
    margin: 12,
  })

export const mount = tanstackMount(
  definition,
  'World population-density choropleth',
  {
    format: ({ datum }) =>
      'properties' in datum && 'density' in datum.properties
        ? `${datum.properties['Country Name']} · ${datum.properties.density} people/km²`
        : 'World land',
  },
)
