import * as Plot from '@observablehq/plot'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import { learningPovertyPointsByPopulation } from '../../shared/transforms/learning-poverty'
import { mountObservablePlot } from '../../shared/mount'
import type { LearningPovertyPoint } from '../../shared/transforms/learning-poverty'
import type { ConformanceMount } from '../../types'

const fills = ['#2563eb', '#0891b2']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'World population bubble map',
      projection: {
        type: 'equal-earth',
        domain: worldSphere,
        clip: false,
      },
      r: {
        type: 'sqrt',
        range: [2, 18],
      },
      marks: [
        Plot.geo([worldLand], {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.5,
        }),
        Plot.geo(learningPovertyPointsByPopulation, {
          r: (country: LearningPovertyPoint) => country.properties.population,
          fill: fills[nextInput.revision % 2] ?? fills[0],
          fillOpacity: 0.72,
          stroke: '#ffffff',
          strokeWidth: 0.75,
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
