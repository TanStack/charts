import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleSqrt } from 'd3-scale'
import {
  previewWorldLand,
  worldLand,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import { learningPovertyPointsByPopulation } from '@tanstack/charts-data/learning-poverty-geography'

const fills = ['#2563eb', '#0891b2']
const projection = {
  type: geoEqualEarth,
  fit: 'sphere' as const,
}
const previewProjection = {
  type: () => geoEqualEarth().precision(2),
  fit: 'sphere' as const,
}

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
      marks: [
        geoShape([input.preview ? previewWorldLand : worldLand], {
          projection: input.preview ? previewProjection : projection,
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.5,
        }),
        geoShape(learningPovertyPointsByPopulation, {
          projection: input.preview ? previewProjection : projection,
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
          projection: input.preview ? previewProjection : projection,
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.35,
          strokeWidth: 0.75,
        }),
      ],
      margin: 10,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'properties' in datum && 'population' in datum.properties
              ? `${datum.properties['Country Name']} · ${datum.properties.population.toLocaleString()} people`
              : 'World land',
        },
      },
    },
  )
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'World population bubble map'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
