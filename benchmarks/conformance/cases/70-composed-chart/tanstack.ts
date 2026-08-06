import { weather } from '@charts-poc/demo-data/weather'
import { areaY, barY, d3Curve, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const monotone = d3Curve(curveMonotoneX)
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const composedChartDefinition = (input: ConformanceInput) => {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 6)

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y: 'temp_max',
        fill: '#8884d8',
        fillOpacity: 0.2,
        stroke: '#8884d8',
        curve: monotone,
      }),
      barY(rows, {
        id: 'precipitation-bars',
        x: 'date',
        y: 'precipitation',
        fill: '#413ea0',
        maxThickness: 20,
      }),
      lineY(rows, {
        x: 'date',
        y: 'temp_min',
        stroke: '#ff7300',
        strokeWidth: 2,
        curve: monotone,
      }),
      dot(rows, {
        x: 'date',
        y: 'wind',
        fill: '#ef4444',
        r: 4.5,
      }),
    ],
    x: {
      scale: () => scaleBand<Date>().paddingInner(0.1).paddingOuter(0.05),
      axis: {
        ticks: { format: (value: Date) => dateFormat.format(value) },
      },
    },
    y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 5 } } },
    margin: { top: 20, right: 20, bottom: 50, left: 80 },
  })
}

export const mount = tanstackMount(
  composedChartDefinition,
  'Layered Seattle weather',
)
