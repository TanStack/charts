import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { entranceRows } from './model'
import type { ConformanceInput } from '../../types'

const render = (input: ConformanceInput) =>
  Plot.plot({
    ariaLabel: 'Staggered monthly actuals and target',
    width: input.width,
    height: input.height,
    margin: 20,
    x: { axis: null, padding: 0.1 },
    y: { axis: null, domain: [0, 100] },
    marks: [
      Plot.barY(entranceRows, {
        x: 'period',
        y: 'actual',
        fill: '#7c3aed',
        inset: 4,
        rx: 7,
      }),
      Plot.lineY(entranceRows, {
        x: 'period',
        y: 'target',
        stroke: '#f97316',
        strokeWidth: 3,
      }),
    ],
  })

export const mount = (container: HTMLElement, input: ConformanceInput) =>
  mountObservablePlot(container, input, render)
