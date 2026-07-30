import { areaY, defineChart, lineY } from '@tanstack/charts'
import { quantile, rollups } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import { quantileData, quantileDateDomain, quantileValueDomain } from './data'
import type { QuantileObservation } from './data'

interface QuantileSummary {
  id: string
  date: Date
  lower: number
  median: number
  upper: number
}

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = summarizeQuantiles(quantileData(input.revision))

    return {
      marks: [
        areaY(rows, {
          x: 'date',
          y1: 'lower',
          y2: 'upper',
          key: 'id',
          fill: '#0ea5e9',
          fillOpacity: 0.22,
        }),
        lineY(rows, {
          x: 'date',
          y: 'median',
          key: 'id',
          stroke: '#0369a1',
          strokeWidth: 2.25,
        }),
      ],
      x: {
        scale: scaleUtc().domain(quantileDateDomain),
        label: 'Month',
      },
      y: {
        scale: scaleLinear().domain(quantileValueDomain),
        grid: true,
        label: 'Observed value',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Median trend with tenth-to-ninetieth percentile ribbon',
)

function summarizeQuantiles(
  rows: readonly QuantileObservation[],
): readonly QuantileSummary[] {
  return rollups(
    rows,
    (values) => ({
      lower: quantile(values, 0.1, (row) => row.value),
      median: quantile(values, 0.5, (row) => row.value),
      upper: quantile(values, 0.9, (row) => row.value),
    }),
    (row) => row.date,
  ).flatMap(([date, summary]) =>
    summary.lower === undefined ||
    summary.median === undefined ||
    summary.upper === undefined
      ? []
      : [
          {
            id: date.toISOString(),
            date,
            lower: summary.lower,
            median: summary.median,
            upper: summary.upper,
          },
        ],
  )
}
