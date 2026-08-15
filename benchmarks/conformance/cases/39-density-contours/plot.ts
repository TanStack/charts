import { penguins } from '@tanstack/charts-data/penguins'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const densityBandwidth = 18
const densityThresholds = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = penguins
      .filter(
        (row) => row.culmen_length_mm !== null && row.culmen_depth_mm !== null,
      )
      .slice(nextInput.revision * 8, nextInput.revision * 8 + 320)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 0,
      ariaLabel: 'Point density contours',
      x: { domain: [30, 62], axis: null },
      y: { domain: [12, 23], axis: null },
      marks: [
        Plot.density(rows, {
          x: 'culmen_length_mm',
          y: 'culmen_depth_mm',
          bandwidth: densityBandwidth,
          thresholds: densityThresholds,
          fill: '#2563eb',
          fillOpacity: 0.16,
          stroke: '#1e3a8a',
          strokeWidth: 1,
        }),
      ],
    })
  })
