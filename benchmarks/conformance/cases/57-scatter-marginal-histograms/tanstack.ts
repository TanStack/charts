import {
  colorLegend,
  defineChart,
  dot,
  rect,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import { bin, max } from 'd3-array'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { marginalData, marginalGroups } from './data'
import type { MarginalPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface MarginalRect {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
}

const colors = ['#2563eb', '#ea580c', '#059669']

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = marginalData(input.revision)
  const { xRects, yRects } = marginalRects(rows)

  return {
    marks: [
      dot(rows, {
        x: 'x',
        y: 'y',
        z: 'group',
        key: 'id',
        r: 3,
        fillOpacity: 0.78,
      }),
      rect(xRects, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        key: 'id',
        fill: '#0ea5e9',
        fillOpacity: 0.78,
        inset: 1,
      }),
      rect(yRects, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        key: 'id',
        fill: '#f97316',
        fillOpacity: 0.78,
        inset: 1,
      }),
      ruleX([80], { strokeOpacity: 0.5 }),
      ruleY([80], { strokeOpacity: 0.5 }),
    ],
    x: {
      scale: scaleLinear().domain([0, 100]),
      grid: true,
      format: visibleScatterTick,
      label: 'X score',
    },
    y: {
      scale: scaleLinear().domain([0, 100]),
      grid: true,
      format: visibleScatterTick,
      label: 'Y score',
    },
    color: {
      scale: scaleOrdinal<MarginalPoint['group'], string>()
        .domain(marginalGroups)
        .range(colors),
      legend: colorLegend({ label: 'Group' }),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Scatterplot with marginal histograms',
)

function marginalRects(rows: readonly MarginalPoint[]): {
  xRects: readonly MarginalRect[]
  yRects: readonly MarginalRect[]
} {
  const thresholds = [10, 20, 30, 40, 50, 60, 70]
  const xBins = bin<MarginalPoint, number>()
    .domain([0, 80])
    .thresholds(thresholds)
    .value((row) => row.x)(rows)
  const yBins = bin<MarginalPoint, number>()
    .domain([0, 80])
    .thresholds(thresholds)
    .value((row) => row.y)(rows)
  const maxX = max(xBins, (bucket) => bucket.length) ?? 1
  const maxY = max(yBins, (bucket) => bucket.length) ?? 1
  const xRects: MarginalRect[] = []
  const yRects: MarginalRect[] = []

  xBins.forEach((bucket, index) => {
    if (bucket.x0 === undefined || bucket.x1 === undefined) return
    xRects.push({
      id: `x:${index}`,
      x1: bucket.x0,
      x2: bucket.x1,
      y1: 84,
      y2: 84 + (bucket.length / maxX) * 14,
    })
  })

  yBins.forEach((bucket, index) => {
    if (bucket.x0 === undefined || bucket.x1 === undefined) return
    yRects.push({
      id: `y:${index}`,
      x1: 84,
      x2: 84 + (bucket.length / maxY) * 14,
      y1: bucket.x0,
      y2: bucket.x1,
    })
  })

  return { xRects, yRects }
}

function visibleScatterTick(value: number): string {
  return value <= 80 ? `${value}` : ''
}
