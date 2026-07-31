import { simpsons } from '@charts-poc/demo-data/simpsons'
import { areaY, d3Curve, defineChart, lineY, ruleY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { isRatedEpisode, ridgeDensity, ridgeSeasons } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#0d9488', '#d97706']

const definition = (input: ConformanceInput) => {
  const seasons = ridgeSeasons(input.revision)
  const rows = ridgeDensity(simpsons.filter(isRatedEpisode), seasons)
  const curve = d3Curve(curveBasis)

  return defineChart({
    marks: [
      ruleY([0, 1, 2], {
        stroke: '#94a3b8',
        strokeOpacity: 0.5,
      }),
      areaY(rows, {
        x: 'imdb_rating',
        y1: 'baseline',
        y2: 'density',
        color: 'season',
        fillOpacity: 0.52,
        curve,
      }),
      lineY(rows, {
        x: 'imdb_rating',
        y: 'density',
        color: 'season',
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
      scale: scaleLinear().domain([-0.08, 2.86]),
      axis: {
        ticks: {
          count: seasons.length,
          format: (value) => {
            const season = seasons[Math.round(value)]
            return season === undefined ? '' : `Season ${season}`
          },
        },
      },
    },
    color: {
      range: colors,
    },
    margin: { left: 76 },
  })
}

export const mount = tanstackMount(definition, 'Ridgeline density comparison')
