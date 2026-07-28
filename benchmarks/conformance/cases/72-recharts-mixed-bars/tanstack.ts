import { barY, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { mixedBarCategories, mixedBarData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

type BarSlot = 'stack' | 'independent'

const groupScale = scaleBand<BarSlot>()
  .domain(['stack', 'independent'])
  .paddingInner(0.08)

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = mixedBarData(input.revision)

  return {
    marks: [
      barY(rows, {
        x: 'name',
        y1: 0,
        y2: 'pv',
        z: () => 'stack',
        key: 'name',
        fill: '#8884d8',
        groupScale,
        inset: 1,
      }),
      barY(rows, {
        x: 'name',
        y1: 'pv',
        y2: (row) => row.pv + row.amt,
        z: () => 'stack',
        key: 'name',
        fill: '#82ca9d',
        groupScale,
        inset: 1,
      }),
      barY(rows, {
        x: 'name',
        y: 'uv',
        z: () => 'independent',
        key: 'name',
        fill: '#ffc658',
        groupScale,
        inset: 1,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(mixedBarCategories)
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
    y: {
      scale: scaleLinear().domain([0, 13_000]),
      ticks: 5,
      grid: true,
    },
    margin: { top: 20, right: 20, bottom: 50, left: 80 },
  }
})

export const mount = tanstackMount(
  definition,
  'Stacked and adjacent category bars',
)
