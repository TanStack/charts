import { simpsons } from '@charts-poc/demo-data/simpsons'
import { cell, colorGradientLegend, defineChart, text } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const episodeDomain = [
  ...new Set(simpsons.map((row) => row.number_in_season)),
].sort((left, right) => left - right)
const seasonDomain = [...new Set(simpsons.map((row) => row.season))].sort(
  (left, right) => left - right,
)
const ratedEpisodes = simpsons.filter((row) => row.imdb_rating !== null)
const unratedEpisodes = simpsons.filter((row) => row.imdb_rating === null)
const ratingColors = ['#8e0152', '#f7f7f7', '#276419']

const definition = (_input: ConformanceInput) =>
  defineChart({
    marks: [
      cell(ratedEpisodes, {
        x: 'number_in_season',
        y: 'season',
        color: 'imdb_rating',
        inset: 1,
      }),
      cell(unratedEpisodes, {
        x: 'number_in_season',
        y: 'season',
        fill: '#d1d5db',
        inset: 1,
      }),
      text(simpsons, {
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
    x: {
      scale: scaleBand<number>()
        .domain(episodeDomain)
        .paddingInner(0.04)
        .paddingOuter(0.02),
      axis: { label: 'Episode' },
    },
    y: {
      scale: scaleBand<number>()
        .domain(seasonDomain)
        .paddingInner(0.04)
        .paddingOuter(0.02),
      axis: { label: 'Season' },
    },
    color: {
      scale: () => scaleLinear<string>().range(ratingColors),
      legend: colorGradientLegend({ label: 'IMDb rating', steps: 6 }),
    },
  })

export const mount = tanstackMount(definition, 'The Simpsons episode ratings', {
  format: ({ datum }) =>
    `${datum.title} · Season ${datum.season}, episode ${datum.number_in_season} · ${
      datum.imdb_rating === null
        ? 'No IMDb rating'
        : `${datum.imdb_rating.toFixed(1)} IMDb`
    }`,
})
