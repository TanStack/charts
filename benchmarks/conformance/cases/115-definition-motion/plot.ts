import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { definitionMotionRows } from './model'
import type { ConformanceInput } from '../../types'

const render = (input: ConformanceInput) => {
  const rows = definitionMotionRows(input.revision)
  const maximum = Math.max(100, ...rows.map((row) => row.actual))
  return Plot.plot({
    ariaLabel: 'Definition-owned chart, mark, datum, and guide motion',
    width: input.width,
    height: input.height,
    marginLeft: 52,
    marginBottom: 44,
    x: { label: 'Period' },
    y: { label: 'Value', domain: [0, Math.ceil(maximum / 20) * 20] },
    marks: [
      Plot.gridY({ strokeOpacity: 0.12 }),
      Plot.barY(rows, {
        x: 'period',
        y: 'actual',
        fill: '#7c3aed',
        inset: 5,
        rx: 6,
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
