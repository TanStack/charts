import { barY, defineChart } from '@tanstack/charts'
import { rollups, sum } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { CategoryPoint } from '../../shared/data'
import { categoryData, categoryTotalDomain } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input, width }) => {
  const rows = summarizeCategories(categoryData(input.revision)).sort(
    (left, right) => right.value - left.value,
  )

  return {
    marks: [
      barY(rows, {
        x: 'category',
        y: 'value',
        key: 'id',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(rows.map((row) => row.category))
        .paddingInner(0.1)
        .paddingOuter(0.05),
      tickRotate: width < 560 ? -32 : 0,
    },
    y: {
      scale: scaleLinear().domain(categoryTotalDomain),
      label: 'Total value',
      ticks: 5,
      grid: true,
    },
  }
})

export const mount = tanstackMount(definition, 'Sorted vertical bars')

function summarizeCategories(rows: readonly CategoryPoint[]) {
  return rollups(
    rows,
    (values) => sum(values, (row) => row.value),
    (row) => row.category,
  ).map(([category, value]) => ({
    id: category,
    category,
    value,
  }))
}
