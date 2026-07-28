import * as Plot from '@observablehq/plot'
import { vectorData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Two-dimensional vector field',
    x: { domain: [-0.75, 5.75], grid: true, label: 'X' },
    y: { domain: [-0.75, 4.75], grid: true, label: 'Y' },
    marks: [
      Plot.vector(vectorData(input.revision), {
        x: 'x',
        y: 'y',
        length: 'speed',
        rotate: 'direction',
        stroke: '#2563eb',
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
