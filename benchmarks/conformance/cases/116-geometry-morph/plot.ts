import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { morphData } from './model'
import type { ConformanceInput } from '../../types'

const render = (input: ConformanceInput) =>
  Plot.plot({
    ariaLabel: 'Data morphing across chart geometries',
    width: input.width,
    height: input.height,
    marginLeft: 44,
    marginBottom: 36,
    x: { label: null },
    y: { label: null, domain: [0, 100], grid: true },
    color: { type: 'identity' },
    marks: [
      Plot.barY(morphData, {
        x: 'label',
        y: 'value',
        fill: 'color',
        inset: 6,
        rx: 8,
      }),
    ],
  })

export const mount = (container: HTMLElement, input: ConformanceInput) =>
  mountObservablePlot(container, input, render)
