import * as Plot from '@observablehq/plot'
import { hexbinData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const colors = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'] as const

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 40,
    marginLeft: 48,
    ariaLabel: 'Hexagonally binned point density',
    x: { domain: [0, 100], grid: true, label: 'X' },
    y: { domain: [0, 100], grid: true, label: 'Y' },
    color: {
      type: 'threshold',
      domain: [5, 12, 24],
      range: colors,
    },
    marks: [
      Plot.hexagon(
        hexbinData(input.revision),
        Plot.hexbin(
          { fill: 'count' },
          {
            x: 'x',
            y: 'y',
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
