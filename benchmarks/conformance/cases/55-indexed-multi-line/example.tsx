import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  defineChart,
  lineY,
  normalize,
  ruleY,
  select,
  text,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@tanstack/charts-data/industries'
import type { IndustriesRow } from '@tanstack/charts-data/industries'

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed']
const formatIndex = (value: number) => `${Math.round((value - 1) * 100)}%`
const includedIndustries = new Set([
  'Construction',
  'Finance',
  'Government',
  'Manufacturing',
])
export const indexedIndustryObservations = industries.filter(
  (row) =>
    row.date >= new Date(Date.UTC(2008, 0, 1)) &&
    includedIndustries.has(row.industry),
)

export const createExampleChart = (input: ChartOptions) => {
  const source: readonly IndustriesRow[] = indexedIndustryObservations
  const preview = input.preview === true
  const rows = normalize(
    [...source].sort(
      (left, right) => left.date.getTime() - right.date.getTime(),
    ),
    {
      value: 'unemployed',
      by: 'industry',
      basis: 'first',
      as: 'indexed',
    },
  )
  const labels = select(rows, {
    by: 'industry',
    value: (datum) => datum.date.getTime(),
    select: 'max',
  })
  return defineChart(
    {
      marks: [
        ruleY([1], { strokeOpacity: 0.65 }),
        lineY(rows, {
          id: 'indexed-lines',
          x: 'date',
          y: 'indexed',
          color: 'industry',
          strokeWidth: 2.25,
        }),
        ...(preview
          ? []
          : [
              text(labels, {
                id: 'end-labels',
                x: 'date',
                y: 'indexed',
                text: 'industry',
                color: 'industry',
                anchor: 'start',
                dx: 5,
              }),
            ]),
      ],
      x: { scale: scaleUtc, axis: { label: 'Month' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: {
          ticks: { format: formatIndex },
          label: 'Change from January 2008',
        },
      },
      color: {
        range: colors,
      },
      margin: { right: 108 },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.industry} · ${datum.date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })} · ${formatIndex(datum.indexed)} from start`,
        },
      },
    },
  )
}
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Indexed U.S. industry unemployment'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
