import { barY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { groups, sum } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { stack } from 'd3-shape'
import type { CategoryPoint } from '../../shared/data'
import { categoryData, categoryTotalDomain } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const seriesDomain: CategoryPoint['series'][] = ['Desktop', 'Mobile', 'Tablet']
const seriesColors = ['#2563eb', '#f97316', '#10b981']

interface CategoryStackRow {
  category: string
  Desktop: number
  Mobile: number
  Tablet: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = categoryData(input.revision)
  const intervals = stackRows(rows)
  const categoryDomain = [...new Set(rows.map((row) => row.category))]

  return {
    marks: [
      barY(intervals, {
        x: 'category',
        y1: 'y1',
        y2: 'y2',
        z: 'series',
        key: 'id',
        inset: 1,
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(categoryDomain)
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
    y: {
      scale: scaleLinear().domain(categoryTotalDomain),
      label: 'Total value',
      ticks: 5,
      grid: true,
    },
    color: {
      scale: scaleOrdinal<CategoryPoint['series'], string>()
        .domain(seriesDomain)
        .range(seriesColors),
      legend: colorLegend({
        label: 'Device',
      }),
    },
  }
})

export const mount = tanstackMount(definition, 'Stacked bars')

function stackRows(rows: readonly CategoryPoint[]) {
  const buckets = groups(rows, (row) => row.category).map(
    ([category, values]): CategoryStackRow => ({
      category,
      Desktop: sum(
        values.filter((row) => row.series === 'Desktop'),
        (row) => row.value,
      ),
      Mobile: sum(
        values.filter((row) => row.series === 'Mobile'),
        (row) => row.value,
      ),
      Tablet: sum(
        values.filter((row) => row.series === 'Tablet'),
        (row) => row.value,
      ),
    }),
  )

  return stack<CategoryStackRow, CategoryPoint['series']>()
    .keys(seriesDomain)
    .value((row, series) => row[series])(buckets)
    .flatMap((layer) =>
      layer.map((point) => ({
        id: `${point.data.category}:${layer.key}`,
        category: point.data.category,
        series: layer.key,
        value: point[1] - point[0],
        y1: point[0],
        y2: point[1],
      })),
    )
}
