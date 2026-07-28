import { cell, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleOrdinal } from 'd3-scale'
import { waffleCategories, waffleCells, waffleColors, waffleData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { WaffleCategory } from './data'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const segments = waffleData(input.revision)
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const columns = Math.max(
    1,
    Math.floor(Math.sqrt((total * input.width) / Math.max(1, input.height))),
  )
  const rowCount = Math.ceil(total / columns)
  const columnDomain = Array.from({ length: columns }, (_, index) => index)
  const rowDomain = Array.from(
    { length: rowCount },
    (_, index) => rowCount - index - 1,
  )
  const cells = waffleCells(segments, columns)

  return {
    marks: [
      cell(cells, {
        x: 'column',
        y: 'row',
        z: 'category',
        key: 'id',
        inset: 1,
        radius: 2,
      }),
    ],
    x: {
      scale: scaleBand<number>().domain(columnDomain),
    },
    y: {
      scale: scaleBand<number>().domain(rowDomain),
    },
    guides: false,
    color: {
      scale: scaleOrdinal<WaffleCategory, string>()
        .domain(waffleCategories)
        .range(waffleColors),
      legend: colorLegend({ label: 'Response' }),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'One-hundred-unit adoption waffle chart',
)
