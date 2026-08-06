import { penguins } from '@charts-poc/demo-data/penguins'
import {
  binY,
  d3AreaXCurve,
  defineChart,
  dot,
  groupBy,
  median,
  normalize,
  tickY,
  violinY,
} from '@tanstack/charts'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { isPenguinMass, massBoundaries, violinSpecies } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#64748b', '#0d9488', '#7c3aed']

export const violinDefinition = (input: ConformanceInput) => {
  const observations = penguins
    .filter(isPenguinMass)
    .slice(input.revision * 8, input.revision * 8 + 320)
  const bins = binY(observations, {
    value: 'body_mass_g',
    by: 'species',
    thresholds: massBoundaries,
    outputs: { count: { reduce: 'count' } },
  })
  const profiles = normalize(bins, {
    value: 'count',
    by: 'species',
    basis: 'max',
    as: 'width',
  })
  const summaries = groupBy(observations, {
    by: 'species',
    outputs: {
      median: { value: 'body_mass_g', reduce: median },
    },
  })

  return defineChart({
    marks: [
      violinY(profiles, {
        id: 'mass-violins',
        x: 'species',
        y: 'y',
        width: 'width',
        key: (row) => `${row.species}:${row.y}`,
        span: 0.76,
        color: 'species',
        fillOpacity: 0.58,
        curve: d3AreaXCurve(curveBasis),
      }),
      tickY(summaries, {
        id: 'median-ticks',
        x: 'species',
        y: 'median',
        key: 'species',
        span: 0.36,
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
      dot(summaries, {
        id: 'median-dots',
        x: 'species',
        y: 'median',
        key: 'species',
        color: 'species',
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 3.5,
      }),
    ],
    x: {
      scale: scalePoint<string>().domain(violinSpecies).padding(0.5),
    },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Body mass (g)' } },
    color: {
      domain: violinSpecies,
      range: colors,
    },
  })
}

export const mount = tanstackMount(
  violinDefinition,
  'Violin distribution comparison',
  {
    format: ({ datum }) =>
      'median' in datum
        ? `${datum.species} · median body mass ${datum.median.toLocaleString(
            'en-US',
          )} g`
        : `${datum.species} · distribution at ${datum.y.toLocaleString(
            'en-US',
          )} g`,
  },
)
