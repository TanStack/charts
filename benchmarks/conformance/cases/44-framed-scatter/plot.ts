import * as Plot from '@observablehq/plot'
import { scatterData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    margin: 20,
    ariaLabel: 'Guide-free scatterplot with a framed plotting region',
    x: { domain: [0, 105], axis: null },
    y: { domain: [0, 90], axis: null },
    marks: [
      Plot.frame({
        inset: 4,
        rx: 6,
        fill: '#eff6ff',
        stroke: '#2563eb',
        strokeOpacity: 0.7,
      }),
      Plot.dot(scatterData(input.revision), {
        x: 'x',
        y: 'y',
        fill: '#2563eb',
        fillOpacity: 0.65,
        r: 3,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
