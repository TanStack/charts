import * as Plot from '@observablehq/plot'
import { spatialData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = spatialData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Delaunay spatial network',
      x: { domain: [0, 100], grid: true, label: 'X' },
      y: { domain: [0, 100], grid: true, label: 'Y' },
      marks: [
        Plot.delaunayLink(rows, {
          x: 'x',
          y: 'y',
          ariaLabel: 'link',
          stroke: '#94a3b8',
          strokeOpacity: 0.75,
          strokeWidth: 1,
        }),
        Plot.dot(rows, {
          x: 'x',
          y: 'y',
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
      ],
    })
  })
