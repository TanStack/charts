import * as Plot from '@observablehq/plot'
import { candleData, candleDomain } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = candleData(nextInput.revision)
    const gains = rows.filter((row) => row.close >= row.open)
    const losses = rows.filter((row) => row.close < row.open)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Daily candlestick chart',
      x: { domain: candleDomain, label: null },
      y: { domain: [75, 130], grid: true, label: 'Price' },
      marks: [
        Plot.ruleX(rows, {
          x: 'date',
          y1: 'low',
          y2: 'high',
          stroke: '#64748b',
        }),
        Plot.ruleX(gains, {
          x: 'date',
          y1: 'open',
          y2: 'close',
          stroke: '#10b981',
          strokeWidth: 5,
        }),
        Plot.ruleX(losses, {
          x: 'date',
          y1: 'open',
          y2: 'close',
          stroke: '#ef4444',
          strokeWidth: 5,
        }),
      ],
    })
  })
