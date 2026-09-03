import { cars } from '@tanstack/charts-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  const rows = cars
    .filter((row) => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 320)

  return Plot.plot({
    width: input.width,
    height: input.height,
    margin: 20,
    ariaLabel: 'Guide-free scatterplot with a framed plotting region',
    x: { axis: null },
    y: { axis: null },
    marks: [
      Plot.frame({
        inset: 4,
        rx: 6,
        fill: '#eff6ff',
        stroke: '#2563eb',
        strokeOpacity: 0.7,
      }),
      Plot.dot(rows, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        fill: '#2563eb',
        fillOpacity: 0.65,
        r: 3,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
