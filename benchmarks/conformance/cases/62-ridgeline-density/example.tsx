import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { simpsons } from '@charts-poc/demo-data/simpsons'
import {
  binX,
  d3Curve,
  defineChart,
  normalize,
  ridgelineY,
  ruleY,
} from '@tanstack/charts'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { isRatedEpisode, ratingBoundaries, ridgeSeasons } from './selection'
import type { RatedEpisode } from './selection'

const colors = ['#2563eb', '#0d9488', '#d97706']

export const ridgelineDefinition = (input: ExampleOptions) => {
  const seasons = ridgeSeasons(input.revision)
  const episodes = simpsons.filter(
    (row): row is RatedEpisode =>
      isRatedEpisode(row) && seasons.includes(row.season),
  )
  const bins = binX(episodes, {
    value: 'imdb_rating',
    by: 'season',
    thresholds: ratingBoundaries,
    outputs: { count: { reduce: 'count' } },
  })
  const rows = normalize(bins, {
    value: 'count',
    by: 'season',
    basis: 'max',
    as: 'height',
  })
  const overlap = 0.78
  const curve = d3Curve(curveBasis)

  return defineChart({
    marks: [
      ruleY(seasons, {
        id: 'season-guides',
        stroke: '#94a3b8',
        strokeOpacity: 0.5,
      }),
      ridgelineY(rows, {
        id: 'rating-ridges',
        x: 'x',
        y: 'season',
        height: 'height',
        key: (row) => `${row.season}:${row.x}`,
        overlap,
        color: 'season',
        fillOpacity: 0.52,
        strokeWidth: 1.5,
        curve,
      }),
    ],
    x: {
      scale: scaleLinear().domain([4, 10]),
      grid: true,
      axis: { label: 'IMDb rating' },
    },
    y: {
      scale: scalePoint<number>().domain(seasons).padding(overlap),
      reverse: true,
      axis: {
        ticks: {
          values: seasons,
          format: (season) => `Season ${season}`,
        },
      },
    },
    color: {
      range: colors,
    },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Ridgeline density comparison'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(ridgelineDefinition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
