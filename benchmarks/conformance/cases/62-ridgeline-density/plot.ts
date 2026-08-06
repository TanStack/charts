import { simpsons } from '@charts-poc/demo-data/simpsons'
import * as Plot from '@observablehq/plot'
import { isRatedEpisode, ridgeSeasons } from './selection'
import { ridgeDensity } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#2563eb', '#0d9488', '#d97706']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const seasons = ridgeSeasons(nextInput.revision)
    const rows = ridgeDensity(simpsons.filter(isRatedEpisode), seasons)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Ridgeline density comparison',
      marginLeft: 76,
      x: { domain: [4, 10], label: 'IMDb rating', grid: true },
      y: {
        domain: [-0.08, 2.86],
        ticks: seasons.length,
        tickFormat: (value: number) => {
          const season = seasons[Math.round(value)]
          return season === undefined ? '' : `Season ${season}`
        },
        label: null,
      },
      color: {
        range: colors,
      },
      marks: [
        Plot.ruleY([0, 1, 2], {
          stroke: '#94a3b8',
          strokeOpacity: 0.5,
        }),
        Plot.areaY(rows, {
          x: 'imdb_rating',
          y1: 'baseline',
          y2: 'density',
          z: 'season',
          fill: 'season',
          fillOpacity: 0.52,
          curve: 'basis',
        }),
        Plot.lineY(rows, {
          x: 'imdb_rating',
          y: 'density',
          z: 'season',
          stroke: 'season',
          strokeWidth: 1.5,
          curve: 'basis',
        }),
      ],
    })
  })
