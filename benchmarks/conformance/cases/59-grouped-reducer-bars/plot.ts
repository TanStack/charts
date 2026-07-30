import * as Plot from '@observablehq/plot'
import { penguins } from '@charts-poc/demo-data/penguins'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Mean penguin body mass by species',
      x: { label: null },
      y: {
        grid: true,
        label: 'Mean body mass (g)',
      },
      marks: [
        Plot.barY(
          penguins,
          Plot.groupX(
            { y: 'mean' },
            {
              x: 'species',
              y: 'body_mass_g',
              fill: '#0ea5e9',
              inset: 1,
              sort: { x: null },
            },
          ),
        ),
        Plot.text(
          penguins,
          Plot.groupX(
            { y: 'mean', text: 'mean' },
            {
              x: 'species',
              y: 'body_mass_g',
              text: 'body_mass_g',
              fill: '#0c4a6e',
              dy: -8,
            },
          ),
        ),
      ],
    })
  })
