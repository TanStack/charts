import * as Plot from '@observablehq/plot'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import { learningPovertyCountries } from '../../shared/transforms/learning-poverty'
import { mountObservablePlot } from '../../shared/mount'
import type { LearningPovertyCountry } from '../../shared/transforms/learning-poverty'
import type { ConformanceMount } from '../../types'

const colorRanges = [
  ['#ecfeff', '#a5f3fc', '#67e8f9', '#06b6d4', '#0e7490', '#164e63'],
  ['#f0fdf4', '#bbf7d0', '#86efac', '#22c55e', '#15803d', '#14532d'],
]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 12,
      ariaLabel: 'World population-density choropleth',
      projection: {
        type: 'equal-earth',
        domain: worldSphere,
        clip: false,
      },
      color: {
        type: 'quantize',
        range: colorRanges[nextInput.revision % 2] ?? colorRanges[0],
      },
      marks: [
        Plot.geo([worldLand], {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.55,
        }),
        Plot.geo(learningPovertyCountries, {
          fill: (country: LearningPovertyCountry) => country.properties.density,
          stroke: 'currentColor',
          strokeOpacity: 0.34,
          strokeWidth: 0.55,
        }),
        Plot.sphere({
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.35,
          strokeWidth: 0.75,
        }),
      ],
    }),
  )
