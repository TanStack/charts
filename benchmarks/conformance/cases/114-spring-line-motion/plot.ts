import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { springLineRows } from './model'
import type { ConformanceInput } from '../../types'

const render = (input: ConformanceInput) => {
  const rows = springLineRows(input.revision)
  return Plot.plot({
    ariaLabel: 'Primary and comparison series with spring motion',
    width: input.width,
    height: input.height,
    margin: 24,
    x: { axis: null, padding: 0.2 },
    y: { axis: null, domain: [0, 100] },
    marks: [
      Plot.lineY(rows, {
        x: 'period',
        y: 'primary',
        stroke: '#7c3aed',
        strokeWidth: 4,
      }),
      Plot.lineY(rows, {
        x: 'period',
        y: 'comparison',
        stroke: '#f97316',
        strokeWidth: 3,
      }),
    ],
  })
}

export const mount = (container: HTMLElement, input: ConformanceInput) =>
  mountObservablePlot(container, input, render)
