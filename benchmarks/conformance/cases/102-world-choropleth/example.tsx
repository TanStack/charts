import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import { scaleThreshold } from 'd3-scale'
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
  ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  ['#ecfeff', '#a5f3fc', '#22d3ee', '#0891b2', '#164e63'],
]
const thresholds = [20, 40, 60, 80]
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
        geoShape(
          input.preview
            ? previewLearningPovertyCountries
            : learningPovertyCountries,
          {
            projection: input.preview ? previewProjection : projection,
            color: (country) => country.properties['Learning Poverty'],
            stroke: '#ffffff',
            strokeWidth: 0.5,
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
        scale: scaleThreshold<number, string>,
        domain: thresholds,
        range: colorRanges[input.revision % 2] ?? colorRanges[0],
      },
      margin: 10,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'properties' in datum && 'Learning Poverty' in datum.properties
              ? `${datum.properties['Country Name']} · ${datum.properties['Learning Poverty']}% learning poverty`
              : 'World land',
        },
      },
    },
  )
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'World learning-poverty choropleth'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
