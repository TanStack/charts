import { areaY, defineChart, lineY } from '@tanstack/charts'
import { quantile, rollups } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'

interface QuantileSummary {
  date: Date
  lower: number
  median: number
  upper: number
}

const definition = () => {
  const rows = summarizeQuantiles(industries)

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y1: 'lower',
        y2: 'upper',
        fill: '#0ea5e9',
        fillOpacity: 0.22,
      }),
      lineY(rows, {
        x: 'date',
        y: 'median',
        stroke: '#0369a1',
        strokeWidth: 2.25,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed people by industry (thousands)' },
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Monthly industry unemployment distribution',
)

function summarizeQuantiles(
  rows: readonly IndustriesRow[],
): readonly QuantileSummary[] {
  return rollups(
    rows,
    (values) => ({
      lower: quantile(values, 0.1, (row) => row.unemployed),
      median: quantile(values, 0.5, (row) => row.unemployed),
      upper: quantile(values, 0.9, (row) => row.unemployed),
    }),
    (row) => row.date.getTime(),
  ).flatMap(([date, summary]) =>
    summary.lower === undefined ||
    summary.median === undefined ||
    summary.upper === undefined
      ? []
      : [
          {
            date: new Date(date),
            lower: summary.lower,
            median: summary.median,
            upper: summary.upper,
          },
        ],
  )
}
