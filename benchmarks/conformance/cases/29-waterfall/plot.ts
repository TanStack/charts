import * as Plot from '@observablehq/plot'
import { pairs } from 'd3-array'
import { driving } from '@tanstack/charts-data/driving'
import type { DrivingRow } from '@tanstack/charts-data/driving'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

interface WaterfallPoint extends DrivingRow {
  label: string
  change: number
  start: number
  end: number
  kind: 'increase' | 'decrease' | 'total'
}

const kinds = ['increase', 'decrease', 'total']
const colors = ['#10b981', '#ef4444', '#2563eb']
const observations = driving.filter((row) => row.year >= 2004)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = buildWaterfall(observations)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Annual changes in U.S. gasoline prices',
      x: { type: 'band', label: null },
      y: { grid: true, label: 'Change in gasoline price (USD per gallon)' },
      color: { domain: kinds, range: colors, legend: true },
      marks: [
        Plot.barY(rows, {
          x: 'label',
          y1: 'start',
          y2: 'end',
          fill: 'kind',
          inset: 1,
          sort: { x: null },
        }),
        Plot.ruleY([0]),
      ],
    })
  })

function buildWaterfall(
  rows: readonly DrivingRow[],
): readonly WaterfallPoint[] {
  let total = 0
  const changes = pairs(rows, (previous, current): WaterfallPoint => {
    const change = current.gas - previous.gas
    const start = total
    total += change
    return {
      ...current,
      label: `${current.year}`,
      change,
      start,
      end: total,
      kind: change >= 0 ? 'increase' : 'decrease',
    }
  })

  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last) return changes

  return [
    ...changes,
    {
      ...last,
      label: `${first.year}–${String(last.year).slice(-2)}`,
      change: total,
      start: 0,
      end: total,
      kind: 'total',
    },
  ]
}
