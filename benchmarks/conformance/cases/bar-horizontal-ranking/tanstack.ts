import { barX, defineChart, ruleX } from '@tanstack/charts'
import { rollups, sum } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { CategoryPoint } from '../../shared/data'
import { categoryData, categoryTotalDomain } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = summarizeCategories(categoryData(input.revision)).sort(
    (left, right) => right.value - left.value,
  )

  return {
    marks: [
      barX(rows, {
        x: 'value',
        y: 'category',
        key: 'id',
        fill: '#7c3aed',
        inset: 1,
      }),
      ruleX([0]),
    ],
    x: {
      scale: scaleLinear().domain(categoryTotalDomain),
      label: 'Total value',
      ticks: 5,
      grid: true,
    },
    y: {
      scale: scaleBand<string>()
        .domain(rows.map((row) => row.category))
        .paddingInner(0.1)
        .paddingOuter(0.05),
      format: formatCategory,
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Horizontal ranking with long labels',
)

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

function formatCategory(value: unknown): string {
  switch (String(value)) {
    case 'Query':
      return 'TanStack Query — async data'
    case 'Router':
      return 'TanStack Router — routing'
    case 'Table':
      return 'TanStack Table — data grids'
    case 'Form':
      return 'TanStack Form — form state'
    case 'Start':
      return 'TanStack Start — full stack'
    case 'Virtual':
      return 'TanStack Virtual — large lists'
    case 'Store':
      return 'TanStack Store — client state'
    case 'DB':
      return 'TanStack DB — reactive data'
    default:
      return String(value)
  }
}
