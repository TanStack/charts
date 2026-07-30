import { defineChart, dot, link } from '@tanstack/charts'
import { rollups, sum } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { categoryData } from '../../shared/data'
import type { CategoryPoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = summarizeCategories(categoryData(input.revision))

    return {
      marks: [
        link(rows, {
          x1: 'category',
          y1: () => 0,
          x2: 'category',
          y2: 'value',
          key: 'id',
          stroke: '#94a3b8',
          strokeWidth: 1.5,
        }),
        dot(rows, {
          x: 'category',
          y: 'value',
          key: 'id',
          fill: '#2563eb',
          r: 4,
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(rows.map((row) => row.category))
          .padding(0.3),
      },
      y: {
        scale: scaleLinear().domain([0, 180]),
        grid: true,
        label: 'Total',
      },
    }
  })

export const mount = tanstackMount(definition, 'Ranked lollipop chart', {
  format: ({ datum }) =>
    `${datum.category} · ${datum.value.toLocaleString('en-US')} total`,
})

function summarizeCategories(rows: readonly CategoryPoint[]) {
  return rollups(
    rows,
    (values) => sum(values, (row) => row.value),
    (row) => row.category,
  )
    .map(([category, value]) => ({ id: category, category, value }))
    .sort((left, right) => right.value - left.value)
}
