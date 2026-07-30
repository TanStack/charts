import { weather } from '@charts-poc/demo-data/weather'
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

type BarSlot = 'stack' | 'independent'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const groupScale = scaleBand<BarSlot>()
  .domain(['stack', 'independent'])
  .paddingInner(0.08)

const definition = (input: ConformanceInput) => {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 7)

  return defineChart({
    marks: [
      barY(rows, {
        x: 'date',
        y1: 0,
        y2: 'precipitation',
        z: () => 'stack',
        fill: '#8884d8',
        groupScale,
        inset: 1,
      }),
      barY(rows, {
        x: 'date',
        y1: 'precipitation',
        y2: (row) => row.precipitation + row.wind,
        z: () => 'stack',
        fill: '#82ca9d',
        groupScale,
        inset: 1,
      }),
      barY(rows, {
        x: 'date',
        y: 'temp_max',
        z: () => 'independent',
        fill: '#ffc658',
        groupScale,
        inset: 1,
      }),
    ],
    x: {
      scale: () => scaleBand<Date>().paddingInner(0.1).paddingOuter(0.05),
      format: (value) => dateFormat.format(value),
    },
    y: {
      scale: scaleLinear,
      ticks: 5,
      grid: true,
    },
    margin: { top: 20, right: 20, bottom: 50, left: 80 },
  })
}

export const mount = tanstackMount(
  definition,
  'Stacked and adjacent Seattle weather bars',
)
