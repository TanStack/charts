import * as Plot from '@observablehq/plot'
import { changeData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = changeData(nextInput.revision)
    const gains = rows.filter((row) => row.direction === 'up')
    const losses = rows.filter((row) => row.direction === 'down')
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Directed quantitative changes',
      x: { domain: [0, 100], grid: true, label: 'State X' },
      y: { domain: [0, 100], grid: true, label: 'State Y' },
      marks: [
        Plot.arrow(gains, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: '#10b981',
          headLength: 8,
        }),
        Plot.arrow(losses, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: '#ef4444',
          headLength: 8,
        }),
      ],
    })
  })
