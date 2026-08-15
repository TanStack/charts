import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleQuantize } from 'd3-scale'
import {
  previewWorldLand,
  worldLand,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import {
  learningPovertyCountries,
  previewLearningPovertyCountries,
} from '@tanstack/charts-data/learning-poverty-geography'

const colorRanges = [
  ['#ecfeff', '#a5f3fc', '#67e8f9', '#06b6d4', '#0e7490', '#164e63'],
  ['#f0fdf4', '#bbf7d0', '#86efac', '#22c55e', '#15803d', '#14532d'],
]
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
          strokeWidth: 0.55,
        }),
        geoShape(
          input.preview
            ? previewLearningPovertyCountries
            : learningPovertyCountries,
          {
            projection: input.preview ? previewProjection : projection,
            color: (country) => country.properties.density,
            stroke: 'currentColor',
            strokeOpacity: 0.34,
            strokeWidth: 0.55,
          },
        ),
        geoShape([worldSphere], {
          projection: input.preview ? previewProjection : projection,
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
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'properties' in datum && 'density' in datum.properties
              ? `${datum.properties['Country Name']} · ${datum.properties.density} people/km²`
              : 'World land',
        },
      },
    },
  )
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'World population-density choropleth'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
