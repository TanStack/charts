import * as Plot from '@observablehq/plot'
import { waterfallData } from './data'
import type { WaterfallContribution } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

interface WaterfallPoint extends WaterfallContribution {
  start: number
  end: number
  kind: 'increase' | 'decrease' | 'total'
}

const kinds = ['increase', 'decrease', 'total']
const colors = ['#10b981', '#ef4444', '#2563eb']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = buildWaterfall(waterfallData(nextInput.revision))
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Contribution waterfall chart',
      x: { domain: rows.map((row) => row.label), label: null },
      y: { domain: [0, 130], grid: true, label: 'Amount' },
      color: { domain: kinds, range: colors, legend: true },
      marks: [
        Plot.barY(rows, {
          x: 'label',
          y1: 'start',
          y2: 'end',
          fill: 'kind',
          inset: 1,
        }),
        Plot.ruleY([0]),
      ],
    })
  })

function buildWaterfall(
  contributions: readonly WaterfallContribution[],
): readonly WaterfallPoint[] {
  let total = 0
  const rows = contributions.map((row): WaterfallPoint => {
    const start = total
    total += row.value
    return {
      ...row,
      start,
      end: total,
      kind: row.value >= 0 ? 'increase' : 'decrease',
    }
  })
  return [
    ...rows,
    {
      id: 'net',
      label: 'Net',
      value: total,
      start: 0,
      end: total,
      kind: 'total',
    },
  ]
}
