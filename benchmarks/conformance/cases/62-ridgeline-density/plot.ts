import * as Plot from '@observablehq/plot'
import { ridgeColors, ridgeData, ridgeRegions } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = ridgeData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Ridgeline density comparison',
      marginLeft: 48,
      x: {
        domain: [0, 100],
        label: 'Value',
        grid: true,
      },
      y: {
        domain: [-0.08, 2.86],
        ticks: ridgeRegions.length,
        tickFormat: (value: number) => ridgeRegions[Math.round(value)] ?? '',
        label: null,
      },
      color: {
        domain: ridgeRegions,
        range: ridgeRegions.map((region) => ridgeColors[region]),
      },
      marks: [
        Plot.ruleY([0, 1, 2], {
          stroke: '#94a3b8',
          strokeOpacity: 0.5,
        }),
        Plot.areaY(rows, {
          x: 'x',
          y1: 'baseline',
          y2: 'density',
          z: 'region',
          fill: 'region',
          fillOpacity: 0.52,
          curve: 'basis',
        }),
        Plot.lineY(rows, {
          x: 'x',
          y: 'density',
          z: 'region',
          stroke: 'region',
          strokeWidth: 1.5,
          curve: 'basis',
        }),
      ],
    })
  })
