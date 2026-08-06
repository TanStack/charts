import { penguins } from '@charts-poc/demo-data/penguins'
import {
  binX,
  binY,
  colorLegend,
  defineChart,
  dot,
  rect,
} from '@tanstack/charts'
import { viewGrid } from '@tanstack/charts/view'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import type { ConformanceInput } from '../../types'

export type CompletePenguin = PenguinsRow & {
  readonly flipper_length_mm: number
  readonly body_mass_g: number
}

export const flipperBoundaries = [170, 180, 190, 200, 210, 220, 230, 240]
export const massBoundaries = [
  2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500,
]

const colors = ['#2563eb', '#ea580c', '#059669']

export const scatterMarginalDefinition = (input: ConformanceInput) => {
  const rows = penguins
    .filter((row): row is CompletePenguin => {
      return row.flipper_length_mm !== null && row.body_mass_g !== null
    })
    .slice(input.revision * 8, input.revision * 8 + 320)
  const xBins = binX(rows, {
    value: 'flipper_length_mm',
    thresholds: flipperBoundaries,
    outputs: { count: { reduce: 'count' } },
  })
  const yBins = binY(rows, {
    value: 'body_mass_g',
    thresholds: massBoundaries,
    outputs: { count: { reduce: 'count' } },
  })
  const flipperScale = scaleLinear().domain([
    flipperBoundaries[0]!,
    flipperBoundaries.at(-1)!,
  ])
  const massScale = scaleLinear().domain([
    massBoundaries[0]!,
    massBoundaries.at(-1)!,
  ])

  return viewGrid({
    id: 'penguin-marginals',
    rows: [
      { id: 'top', size: 82 },
      { id: 'main', grow: 1 },
    ],
    columns: [
      { id: 'main', grow: 1 },
      { id: 'right', size: 82 },
    ],
    gap: 8,
    views: [
      {
        id: 'main',
        row: 'main',
        column: 'main',
        chart: defineChart({
          marks: [
            dot(rows, {
              id: 'penguins',
              x: 'flipper_length_mm',
              y: 'body_mass_g',
              color: 'species',
              r: 3,
              fillOpacity: 0.78,
            }),
          ],
          x: {
            scale: flipperScale,
            grid: true,
            axis: { label: 'Flipper length (mm)' },
          },
          y: {
            scale: massScale,
            grid: true,
            axis: { label: 'Body mass (g)' },
          },
          color: {
            range: colors,
            legend: colorLegend({ label: 'Species' }),
          },
        }),
      },
      {
        id: 'top',
        row: 'top',
        column: 'main',
        share: { x: 'main' },
        chart: defineChart({
          marks: [
            rect(xBins, {
              id: 'flipper-histogram',
              x: 'x',
              x1: 'x1',
              x2: 'x2',
              y: 'count',
              y1: () => 0,
              y2: 'count',
              fill: '#0ea5e9',
              fillOpacity: 0.78,
              inset: 1,
            }),
          ],
          x: { scale: flipperScale },
          y: { scale: scaleLinear },
          guides: false,
        }),
      },
      {
        id: 'right',
        row: 'main',
        column: 'right',
        share: { y: 'main' },
        chart: defineChart({
          marks: [
            rect(yBins, {
              id: 'mass-histogram',
              x: 'count',
              x1: () => 0,
              x2: 'count',
              y: 'y',
              y1: 'y1',
              y2: 'y2',
              fill: '#f97316',
              fillOpacity: 0.78,
              inset: 1,
            }),
          ],
          x: { scale: scaleLinear },
          y: { scale: massScale },
          guides: false,
        }),
      },
    ],
  })
}

export const mount = tanstackMount(
  scatterMarginalDefinition,
  'Scatterplot with marginal histograms',
  {
    format: (point) => {
      const datum = point.datum
      if ('source' in datum && 'x1' in datum) {
        return `Flipper length: ${datum.x1}–${datum.x2} mm · ${datum.count} penguins`
      }
      if ('source' in datum && 'y1' in datum) {
        return `Body mass: ${datum.y1}–${datum.y2} g · ${datum.count} penguins`
      }
      return `${datum.species} · ${datum.flipper_length_mm} mm · ${datum.body_mass_g} g`
    },
  },
)
