import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { updateRows } from './model'
import type { ConformanceInput } from '../../types'

const render = (input: ConformanceInput) => {
  const rows = updateRows(input.revision)
  return Plot.plot({
    ariaLabel: 'Keyed actuals and targets during interrupted updates',
    width: input.width,
    height: input.height,
    margin: 20,
    x: { axis: null, padding: 0.1 },
    y: { axis: null, domain: [0, 100] },
    marks: [
      Plot.barY(rows, {
        x: 'period',
        y: 'actual',
        fill: '#7c3aed',
        inset: 4,
        rx: 7,
      }),
      Plot.lineY(rows, {
        x: 'period',
        y: 'target',
        stroke: '#f97316',
        strokeWidth: 3,
      }),
    ],
  })
}

export const mount = (container: HTMLElement, input: ConformanceInput) =>
  mountObservablePlot(container, input, render)
