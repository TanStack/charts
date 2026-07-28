import * as Plot from '@observablehq/plot'
import {
  densityBandwidth,
  densityPoints,
  densityThresholds,
  densityXDomain,
  densityYDomain,
} from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 0,
      ariaLabel: 'Point density contours',
      x: { domain: densityXDomain, axis: null },
      y: { domain: densityYDomain, axis: null },
      marks: [
        Plot.density(densityPoints(nextInput.revision), {
          x: 'x',
          y: 'y',
          bandwidth: densityBandwidth,
          thresholds: densityThresholds,
          fill: '#2563eb',
          fillOpacity: 0.16,
          stroke: '#1e3a8a',
          strokeWidth: 1,
        }),
      ],
    }),
  )
