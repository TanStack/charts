import { penguins } from '@charts-poc/demo-data/penguins'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const groupRange = ['#2563eb', '#f97316', '#10b981']
const completePenguins = penguins.filter(
  (row) =>
    row.culmen_length_mm !== null &&
    row.culmen_depth_mm !== null &&
    row.body_mass_g !== null,
)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = completePenguins.slice(
      nextInput.revision * 8,
      nextInput.revision * 8 + 320,
    )

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Bubble scatterplot',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        grid: true,
        label: 'Bill length (mm)',
      },
      y: {
        grid: true,
        label: 'Bill depth (mm)',
      },
      r: {
        range: [3, 11],
      },
      color: {
        range: groupRange,
        legend: true,
      },
      marks: [
        Plot.dot(rows, {
          x: 'culmen_length_mm',
          y: 'culmen_depth_mm',
          r: 'body_mass_g',
          fill: 'species',
          fillOpacity: 0.78,
          stroke: 'currentColor',
          strokeOpacity: 0.28,
          strokeWidth: 0.75,
        }),
      ],
    })
  })
