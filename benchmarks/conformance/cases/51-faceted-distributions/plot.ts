import { penguins } from '@tanstack/charts-data/penguins'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const species = ['Adelie', 'Chinstrap', 'Gentoo'] as const
const boundaries = [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = penguins
      .filter((row) => row.body_mass_g !== null)
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 320)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Faceted distribution comparison',
      marginLeft: 116,
      marginRight: 92,
      facet: {
        data: rows,
        y: 'species',
      },
      fy: {
        domain: species,
        label: null,
      },
      x: {
        domain: [2500, 6500],
        grid: true,
        label: 'Body mass (g)',
      },
      y: {
        domain: [0, 0.4],
        grid: true,
        ticks: 3,
        label: 'Proportion',
        percent: true,
      },
      marks: [
        Plot.frame(),
        Plot.rectY(rows, {
          ...Plot.binX(
            { y: 'proportion-facet' },
            {
              x: 'body_mass_g',
              thresholds: boundaries,
            },
          ),
          fill: '#8b5cf6',
          inset: 0.75,
        }),
      ],
    })
  })
