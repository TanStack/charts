import { barY, defineChart, text } from '@tanstack/charts'
import { rollups, sum } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import {
  aggregateCategories,
  aggregateData,
  aggregateValueDomain,
} from './data'
import type { AggregateEvent } from './data'

interface AggregateTotal {
  id: string
  category: AggregateEvent['category']
  value: number
}

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = summarize(aggregateData(input.revision))

    return {
      marks: [
        barY(rows, {
          x: 'category',
          y: 'value',
          key: 'id',
          fill: '#0ea5e9',
          inset: 1,
        }),
        text(rows, {
          x: 'category',
          y: 'value',
          text: 'value',
          key: 'id',
          fill: '#0c4a6e',
          dy: -8,
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(aggregateCategories)
          .paddingInner(0.1)
          .paddingOuter(0.05),
      },
      y: {
        scale: scaleLinear().domain(aggregateValueDomain),
        grid: true,
        label: 'Total amount',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Category totals aggregated from raw events',
)

function summarize(rows: readonly AggregateEvent[]): readonly AggregateTotal[] {
  return rollups(
    rows,
    (values) => sum(values, (row) => row.amount),
    (row) => row.category,
  ).map(([category, value]) => ({
    id: category,
    category,
    value,
  }))
}
