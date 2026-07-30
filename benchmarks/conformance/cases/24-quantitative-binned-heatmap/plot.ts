import { penguins } from '@charts-poc/demo-data/penguins'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const xBoundaries = [30, 34, 38, 42, 46, 50, 54, 58, 62]
const yBoundaries = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = penguins
      .filter(
        (row) => row.culmen_length_mm !== null && row.culmen_depth_mm !== null,
      )
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 320)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Quantitative two-dimensional binned heatmap',
      x: {
        domain: [30, 62],
        grid: true,
        label: 'Bill length (mm)',
      },
      y: {
        domain: [12, 23],
        grid: true,
        label: 'Bill depth (mm)',
      },
      color: {
        type: 'linear',
        range: ['#eff6ff', '#1d4ed8'],
        legend: true,
      },
      marks: [
        Plot.rect(rows, {
          ...Plot.bin(
            { fill: 'count' },
            {
              x: {
                value: 'culmen_length_mm',
                thresholds: xBoundaries,
                domain: [30, 62],
              },
              y: {
                value: 'culmen_depth_mm',
                thresholds: yBoundaries,
                domain: [12, 23],
              },
            },
          ),
          inset: 0.75,
        }),
      ],
    })
  })
