import { anscombe } from '@tanstack/charts-data/anscombe'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const seriesDomain = [1, 2, 3, 4]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: "Anscombe's quartet small multiples",
      marginTop: 28,
      marginRight: 16,
      marginBottom: 36,
      marginLeft: 40,
      facet: {
        data: anscombe,
        x: 'series',
      },
      fx: {
        domain: seriesDomain,
        label: null,
      },
      x: {
        domain: [3, 20],
        grid: true,
        ticks: 5,
      },
      y: {
        domain: [2, 14],
        grid: true,
        ticks: 4,
      },
      marks: [
        Plot.frame(),
        Plot.dot(anscombe, {
          x: 'x',
          y: 'y',
          r: 3.5,
          fill: '#2563eb',
        }),
      ],
    }),
  )
