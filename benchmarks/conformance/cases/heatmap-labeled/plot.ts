import { simpsons } from '@tanstack/charts-data/simpsons'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const episodeDomain = [
  ...new Set(simpsons.map((row) => row.number_in_season)),
].sort((left, right) => left - right)
const seasonDomain = [...new Set(simpsons.map((row) => row.season))].sort(
  (left, right) => left - right,
)
const ratingColors = ['#8e0152', '#f7f7f7', '#276419']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'The Simpsons episode ratings',
      marginTop: 24,
      marginRight: 24,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        domain: episodeDomain,
        label: 'Episode',
      },
      y: {
        domain: seasonDomain,
        label: 'Season',
      },
      color: {
        type: 'linear',
        range: ratingColors,
        unknown: '#d1d5db',
        legend: true,
      },
      marks: [
        Plot.cell(simpsons, {
          x: 'number_in_season',
          y: 'season',
          fill: 'imdb_rating',
          title: 'title',
          inset: 1,
        }),
        Plot.text(simpsons, {
          x: 'number_in_season',
          y: 'season',
          text: (row) =>
            row.imdb_rating === null ? '–' : row.imdb_rating.toFixed(1),
          fill: (row) =>
            row.imdb_rating !== null &&
            (row.imdb_rating < 5.5 || row.imdb_rating > 8.6)
              ? '#f8fafc'
              : '#0f172a',
          fontSize: 10,
          fontWeight: 600,
        }),
      ],
    }),
  )
