import { colorGradientLegend, defineChart, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear, scaleSequential } from 'd3-scale'
import { quantitativeHeatData } from './data'
import type { QuantitativeHeatPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface QuantitativeHeatCell {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
  count: number
}

const boundaries = [0, 10, 20, 30, 40, 50, 60, 70, 80]
const createXBins = bin<QuantitativeHeatPoint, number>()
  .value((row) => row.x)
  .domain([0, 80])
  .thresholds(boundaries.slice(1, -1))
const createYBins = bin<QuantitativeHeatPoint, number>()
  .value((row) => row.y)
  .domain([0, 80])
  .thresholds(boundaries.slice(1, -1))

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const cells: QuantitativeHeatCell[] = []

  for (const xBucket of createXBins(quantitativeHeatData(input.revision))) {
    if (xBucket.x0 === undefined || xBucket.x1 === undefined) continue
    for (const yBucket of createYBins(xBucket)) {
      if (
        yBucket.x0 === undefined ||
        yBucket.x1 === undefined ||
        yBucket.length === 0
      )
        continue
      cells.push({
        id: `${xBucket.x0}:${yBucket.x0}`,
        x1: xBucket.x0,
        x2: xBucket.x1,
        y1: yBucket.x0,
        y2: yBucket.x1,
        count: yBucket.length,
      })
    }
  }

  return {
    marks: [
      rect(cells, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        z: 'count',
        key: 'id',
        inset: 0.75,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 80]),
      grid: true,
      label: 'Latency',
    },
    y: {
      scale: scaleLinear().domain([0, 80]),
      grid: true,
      label: 'Throughput',
    },
    color: {
      scale: scaleSequential<string>()
        .domain([1, 5])
        .range(['#eff6ff', '#1d4ed8']),
      legend: colorGradientLegend({ label: 'Count', steps: 5 }),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Quantitative two-dimensional binned heatmap',
)
