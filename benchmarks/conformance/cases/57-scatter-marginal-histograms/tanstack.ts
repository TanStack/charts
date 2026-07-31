import { penguins } from '@charts-poc/demo-data/penguins'
import {
  colorLegend,
  defineChart,
  dot,
  rect,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import { bin, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import type { ConformanceInput } from '../../types'

type CompletePenguin = PenguinsRow & {
  readonly flipper_length_mm: number
  readonly body_mass_g: number
}

interface MarginalRect {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
}

const colors = ['#2563eb', '#ea580c', '#059669']

const definition = (input: ConformanceInput) => {
  const rows = penguins
    .filter((row): row is CompletePenguin => {
      return row.flipper_length_mm !== null && row.body_mass_g !== null
    })
    .slice(input.revision * 8, input.revision * 8 + 320)
  const { xRects, yRects } = marginalRects(rows)

  return defineChart({
    marks: [
      dot(rows, {
        x: 'flipper_length_mm',
        y: 'body_mass_g',
        color: 'species',
        r: 3,
        fillOpacity: 0.78,
      }),
      rect(xRects, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        fill: '#0ea5e9',
        fillOpacity: 0.78,
        inset: 1,
      }),
      rect(yRects, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        fill: '#f97316',
        fillOpacity: 0.78,
        inset: 1,
      }),
      ruleX([236], { strokeOpacity: 0.5 }),
      ruleY([6550], { strokeOpacity: 0.5 }),
    ],
    x: {
      scale: scaleLinear().domain([170, 245]),
      grid: true,
      axis: {
        ticks: { format: visibleFlipperTick },
        label: 'Flipper length (mm)',
      },
    },
    y: {
      scale: scaleLinear().domain([2500, 7000]),
      grid: true,
      axis: { ticks: { format: visibleMassTick }, label: 'Body mass (g)' },
    },
    color: {
      range: colors,
      legend: colorLegend({ label: 'Species' }),
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Scatterplot with marginal histograms',
)

function marginalRects(rows: readonly CompletePenguin[]): {
  xRects: readonly MarginalRect[]
  yRects: readonly MarginalRect[]
} {
  const xBins = bin<CompletePenguin, number>()
    .domain([170, 240])
    .thresholds([180, 190, 200, 210, 220, 230])
    .value((row) => row.flipper_length_mm)(rows)
  const yBins = bin<CompletePenguin, number>()
    .domain([2500, 6500])
    .thresholds([3000, 3500, 4000, 4500, 5000, 5500, 6000])
    .value((row) => row.body_mass_g)(rows)
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
      y1: 6600,
      y2: 6600 + (bucket.length / maxX) * 350,
    })
  })

  yBins.forEach((bucket, index) => {
    if (bucket.x0 === undefined || bucket.x1 === undefined) return
    yRects.push({
      id: `y:${index}`,
      x1: 237,
      x2: 237 + (bucket.length / maxY) * 7,
      y1: bucket.x0,
      y2: bucket.x1,
    })
  })

  return { xRects, yRects }
}

function visibleFlipperTick(value: number): string {
  return value <= 235 ? `${value}` : ''
}

function visibleMassTick(value: number): string {
  return value <= 6500 ? `${value}` : ''
}
