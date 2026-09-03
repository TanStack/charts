import { cars } from '@tanstack/charts-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const colors = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'] as const

function render(input: ConformanceInput) {
  const rows = cars
    .filter((row) => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 360)

  return Plot.plot({
    width: input.width,
    height: input.height,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 40,
    marginLeft: 48,
    ariaLabel: 'Hexagonally binned point density',
    x: { domain: [1500, 5500], grid: true, label: 'Weight (lb)' },
    y: { domain: [5, 50], grid: true, label: 'Fuel economy (mpg)' },
    color: {
      type: 'threshold',
      domain: [5, 12, 24],
      range: colors,
    },
    marks: [
      Plot.hexagon(
        rows,
        Plot.hexbin(
          { fill: 'count' },
          {
            x: 'weight (lb)',
            y: 'economy (mpg)',
            binWidth: 24,
            r: 11,
            stroke: '#ffffff',
            strokeWidth: 0.75,
          },
        ),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
