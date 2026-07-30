import * as Plot from '@observablehq/plot'
import { industries } from '@charts-poc/demo-data/industries'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'
import { selectMultiLineData } from './selection'

const colors = ['#2563eb', '#ea580c', '#059669']

function render(input: ConformanceInput) {
  const rows = selectMultiLineData(industries, input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    marginRight: 112,
    ariaLabel: 'Unemployment by industry with direct end labels',
    x: { type: 'utc', label: 'Week' },
    y: {
      grid: true,
      label: 'Unemployed (thousands)',
    },
    color: {
      range: colors,
    },
    marks: [
      Plot.lineY(rows, {
        x: 'date',
        y: 'unemployed',
        z: 'industry',
        stroke: 'industry',
        strokeWidth: 2.25,
      }),
      Plot.text(
        rows,
        Plot.selectLast({
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          text: 'industry',
          fill: 'industry',
          textAnchor: 'start',
          dx: 5,
        }),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
