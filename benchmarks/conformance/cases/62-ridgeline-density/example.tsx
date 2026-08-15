import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { simpsons } from '@tanstack/charts-data/simpsons'
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

export const createExampleChart = (input: ChartOptions) => {
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

  return defineChart(
    {
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
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Ridgeline density comparison'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
