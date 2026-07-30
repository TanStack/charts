import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleSqrt } from 'd3-scale'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import { learningPovertyPointsByPopulation } from '../../shared/transforms/learning-poverty'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const fills = ['#2563eb', '#0891b2']
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
      geoShape(learningPovertyPointsByPopulation, {
        projection,
        r: (country) => country.properties.population,
        rScale: {
          scale: () => scaleSqrt().range([2, 18]),
        },
        fill: fills[input.revision % 2] ?? fills[0],
        fillOpacity: 0.72,
        stroke: '#ffffff',
        strokeWidth: 0.75,
      }),
      geoShape([worldSphere], {
        projection,
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.35,
        strokeWidth: 0.75,
      }),
    ],
    margin: 10,
  })

export const mount = tanstackMount(definition, 'World population bubble map', {
  format: ({ datum }) =>
    'properties' in datum && 'population' in datum.properties
      ? `${datum.properties['Country Name']} · ${datum.properties.population.toLocaleString()} people`
      : 'World land',
})
