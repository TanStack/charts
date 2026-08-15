import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoAlbersUsa } from 'd3-geo'
import { scaleQuantile } from 'd3-scale'
import {
  projectedUnemploymentCounties,
  unemploymentCountyCollection,
} from './transform'

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

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
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
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.properties.county}, ${datum.properties.state} · ${datum.properties.rate}% unemployment`,
        },
      },
    },
  )
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'United States county unemployment choropleth'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
