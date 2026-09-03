import { penguins } from '@tanstack/charts-data/penguins'
import * as Plot from '@observablehq/plot'
import { isPenguinMass, violinSpecies } from './selection'
import { violinDensity, violinMedians } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#64748b', '#0d9488', '#7c3aed']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const observations = penguins
      .filter(isPenguinMass)
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 320)
    const rows = violinDensity(observations)
    const summaries = violinMedians(observations)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Violin distribution comparison',
      x: {
        domain: [0.5, 3.5],
        ticks: violinSpecies.length,
        tickFormat: (value: number) =>
          violinSpecies[Math.round(value) - 1] ?? '',
        label: null,
      },
      y: { grid: true, label: 'Body mass (g)' },
      color: {
        range: colors,
      },
      marks: [
        Plot.areaX(rows, {
          x1: 'x1',
          x2: 'x2',
          y: 'body_mass_g',
          z: 'species',
          fill: 'species',
          fillOpacity: 0.58,
          stroke: 'species',
          curve: 'basis',
        }),
        Plot.link(summaries, {
          x1: 'x1',
          x2: 'x2',
          y1: 'body_mass_g',
          y2: 'body_mass_g',
          stroke: '#0f172a',
          strokeWidth: 2,
        }),
        Plot.dot(summaries, {
          x: 'center',
          y: 'body_mass_g',
          fill: 'species',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 3.5,
        }),
      ],
    })
  })
