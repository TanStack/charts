import { penguins } from '@charts-poc/demo-data/penguins'
import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

const sexColors = ['#2563eb', '#f97316']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = penguins
      .slice(0, penguins.length - nextInput.revision * 12)
      .filter((row) => row.sex !== null)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Penguins grouped by species',
      marginBottom: nextInput.width < 640 ? 72 : 48,
      fx: {
        label: null,
        padding: 0.08,
        tickRotate: nextInput.width < 640 ? -32 : 0,
      },
      x: {
        axis: null,
        paddingOuter: 0.16,
      },
      y: {
        grid: true,
        label: 'Penguins',
      },
      color: {
        range: sexColors,
        legend: true,
      },
      marks: [
        Plot.barY(
          rows,
          Plot.groupX(
            { y: 'count' },
            {
              fx: 'species',
              x: 'sex',
              fill: 'sex',
              sort: { fx: null },
              inset: 1,
            },
          ),
        ),
      ],
    })
  })
