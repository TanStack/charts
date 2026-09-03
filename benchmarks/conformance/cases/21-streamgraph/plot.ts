import * as Plot from '@observablehq/plot'
import { industries } from '@tanstack/charts-data/industries'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const colors = [
  '#4e79a7',
  '#f28e2c',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ab',
]

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    marginLeft: 64,
    ariaLabel: 'Unemployment by industry as a streamgraph',
    x: { type: 'utc', label: 'Month' },
    y: {
      grid: true,
      label: 'Unemployed (thousands)',
    },
    color: {
      range: colors,
      legend: true,
    },
    marks: [
      Plot.areaY(
        industries,
        Plot.stackY(
          { offset: 'wiggle', order: 'inside-out' },
          {
            x: 'date',
            y: 'unemployed',
            z: 'industry',
            fill: 'industry',
            fillOpacity: 0.85,
          },
        ),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
