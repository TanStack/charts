import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'
import { bubbleRows } from './model'

const groupRange = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = bubbleRows(nextInput.revision)

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
