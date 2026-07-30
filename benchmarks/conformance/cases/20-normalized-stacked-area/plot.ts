import * as Plot from '@observablehq/plot'
import { industries } from '@charts-poc/demo-data/industries'
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
    ariaLabel: 'Industry share of unemployment',
    x: { type: 'utc', label: 'Month' },
    y: {
      domain: [0, 1],
      nice: false,
      grid: true,
      label: 'Share of unemployment',
      tickFormat: '.0%',
    },
    color: {
      range: colors,
      legend: true,
    },
    marks: [
      Plot.areaY(
        industries,
        Plot.stackY(
          { offset: 'normalize' },
          {
            x: 'date',
            y: 'unemployed',
            z: 'industry',
            fill: 'industry',
            fillOpacity: 0.82,
          },
        ),
      ),
      Plot.ruleY([0]),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
