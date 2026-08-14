import * as Plot from '@observablehq/plot'
import { worldLand, worldSphere } from '@charts-poc/demo-data/country-atlas'
import { learningPovertyCountries } from '@charts-poc/demo-data/learning-poverty-geography'
import { mountObservablePlot } from '../../shared/mount'
import type { LearningPovertyCountry } from '@charts-poc/demo-data/learning-poverty-geography'
import type { ConformanceMount } from '../../types'

const colorRanges = [
  ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  ['#ecfeff', '#a5f3fc', '#22d3ee', '#0891b2', '#164e63'],
]
const thresholds = [20, 40, 60, 80]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'World learning-poverty choropleth',
      projection: {
        type: 'equal-earth',
        domain: worldSphere,
        clip: false,
      },
      color: {
        type: 'threshold',
        domain: thresholds,
        range: colorRanges[nextInput.revision % 2] ?? colorRanges[0],
      },
      marks: [
        Plot.geo([worldLand], {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.5,
        }),
        Plot.geo(learningPovertyCountries, {
          fill: (country: LearningPovertyCountry) =>
            country.properties['Learning Poverty'],
          stroke: '#ffffff',
          strokeWidth: 0.5,
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
