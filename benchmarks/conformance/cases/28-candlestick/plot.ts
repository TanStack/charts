import * as Plot from '@observablehq/plot'
import { aapl } from '@tanstack/charts-data/aapl'
import { selectCandleData } from './selection'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = selectCandleData(aapl, nextInput.revision)
    const gains = rows.filter((row) => row.Close >= row.Open)
    const losses = rows.filter((row) => row.Close < row.Open)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Apple daily candlestick chart',
      x: { label: null },
      y: { grid: true, label: 'Price' },
      marks: [
        Plot.ruleX(rows, {
          x: 'Date',
          y1: 'Low',
          y2: 'High',
          stroke: '#64748b',
        }),
        Plot.ruleX(gains, {
          x: 'Date',
          y1: 'Open',
          y2: 'Close',
          stroke: '#10b981',
          strokeWidth: 5,
        }),
        Plot.ruleX(losses, {
          x: 'Date',
          y1: 'Open',
          y2: 'Close',
          stroke: '#ef4444',
          strokeWidth: 5,
        }),
      ],
    })
  })
