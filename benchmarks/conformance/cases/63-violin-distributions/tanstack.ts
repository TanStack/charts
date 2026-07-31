import { penguins } from '@charts-poc/demo-data/penguins'
import { areaX, d3AreaXCurve, defineChart, dot, link } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import {
  isPenguinMass,
  violinDensity,
  violinMedians,
  violinSpecies,
} from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#64748b', '#0d9488', '#7c3aed']

const definition = (input: ConformanceInput) => {
  const observations = penguins
    .filter(isPenguinMass)
    .slice(input.revision * 8, input.revision * 8 + 320)
  const rows = violinDensity(observations)
  const summaries = violinMedians(observations)

  return defineChart({
    marks: [
      areaX(rows, {
        x1: 'x1',
        x2: 'x2',
        y: 'body_mass_g',
        color: 'species',
        fillOpacity: 0.58,
        curve: d3AreaXCurve(curveBasis),
      }),
      link(summaries, {
        x1: 'x1',
        x2: 'x2',
        y1: 'body_mass_g',
        y2: 'body_mass_g',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
      dot(summaries, {
        x: 'center',
        y: 'body_mass_g',
        color: 'species',
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 3.5,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0.5, 3.5]),
      axis: {
        ticks: {
          count: violinSpecies.length,
          format: (value) => violinSpecies[Math.round(value) - 1] ?? '',
        },
      },
    },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Body mass (g)' } },
    color: {
      range: colors,
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Violin distribution comparison',
  {
    format: ({ datum }) =>
      'center' in datum
        ? `${datum.species} · median body mass ${datum.body_mass_g.toLocaleString(
            'en-US',
          )} g`
        : `${datum.species} · distribution at ${datum.body_mass_g.toLocaleString(
            'en-US',
          )} g`,
  },
)
