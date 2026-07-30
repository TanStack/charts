import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleThreshold } from 'd3-scale'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import { learningPovertyCountries } from '../../shared/transforms/learning-poverty'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colorRanges = [
  ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  ['#ecfeff', '#a5f3fc', '#22d3ee', '#0891b2', '#164e63'],
]
const thresholds = [20, 40, 60, 80]
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
        strokeWidth: 0.5,
      }),
      geoShape(learningPovertyCountries, {
        projection,
        color: (country) => country.properties['Learning Poverty'],
        stroke: '#ffffff',
        strokeWidth: 0.5,
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
      scale: scaleThreshold<number, string>,
      domain: thresholds,
      range: colorRanges[input.revision % 2] ?? colorRanges[0],
    },
    margin: 10,
  })

export const mount = tanstackMount(
  definition,
  'World learning-poverty choropleth',
  {
    format: ({ datum }) =>
      'properties' in datum && 'Learning Poverty' in datum.properties
        ? `${datum.properties['Country Name']} · ${datum.properties['Learning Poverty']}% learning poverty`
        : 'World land',
  },
)
