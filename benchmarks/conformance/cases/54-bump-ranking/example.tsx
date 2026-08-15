import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  d3Curve,
  defineChart,
  dot,
  lineY,
  rank,
  select,
  text,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { industries } from '@tanstack/charts-data/industries'

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed', '#db2777']
const includedIndustries = [
  'Wholesale and Retail Trade',
  'Manufacturing',
  'Leisure and hospitality',
  'Business services',
  'Construction',
] as const
const includedIndustrySet: ReadonlySet<string> = new Set(includedIndustries)
const observations = industries.filter(
  (row) =>
    row.date.getUTCMonth() === 0 &&
    row.date.getUTCFullYear() >= 2004 &&
    includedIndustrySet.has(row.industry),
)

export const createExampleChart = (input?: ChartOptions) => {
  const rows = rank(observations, {
    by: 'date',
    value: 'unemployed',
    order: 'descending',
    ties: 'competition',
  })
  const labels = select(rows, {
    by: 'industry',
    value: (datum) => datum.date.getTime(),
    select: 'max',
  })

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'industry-ranks',
          x: 'date',
          y: 'rank',
          color: 'industry',
          curve: d3Curve(curveBumpX),
          strokeWidth: 2.25,
        }),
        dot(rows, {
          id: 'industry-rank-points',
          x: 'date',
          y: 'rank',
          color: 'industry',
          r: 3,
        }),
        ...(input?.preview === true
          ? []
          : [
              text(labels, {
                id: 'newest-industry-labels',
                x: 'date',
                y: 'rank',
                text: 'industry',
                color: 'industry',
                anchor: 'start',
                dx: 6,
              }),
            ]),
      ],
      x: {
        scale: scaleUtc,
        axis: {
          ticks: { count: 7, format: (date) => `${date.getUTCFullYear()}` },
          label: 'Year',
        },
      },
      y: {
        scale: scaleLinear().domain([5.2, 0.8]),
        grid: true,
        axis: {
          ticks: { count: 5, format: (value) => `#${value}` },
          label: 'Rank',
        },
      },
      color: {
        domain: includedIndustries,
        range: colors,
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Annual unemployment rank by industry'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
