import * as Plot from '@observablehq/plot'
import { quartetData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const setDomain = ['I', 'II', 'III', 'IV']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = quartetData()

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: "Anscombe's quartet small multiples",
      marginTop: 28,
      marginRight: 16,
      marginBottom: 36,
      marginLeft: 40,
      facet: {
        data: rows,
        x: 'set',
      },
      fx: {
        domain: setDomain,
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
        Plot.dot(rows, {
          x: 'x',
          y: 'y',
          r: 3.5,
          fill: '#2563eb',
        }),
      ],
    })
  })
