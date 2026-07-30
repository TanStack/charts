import * as Plot from '@observablehq/plot'
import { contourThresholds, windSpeedGrid } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const grid = windSpeedGrid(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 12,
      ariaLabel: 'Filled wind-speed contours',
      x: { axis: null },
      y: { axis: null },
      color: {
        type: 'threshold',
        domain: contourThresholds.slice(1),
        range: colors,
      },
      marks: [
        Plot.contour(grid.values, {
          width: grid.width,
          height: grid.height,
          value: Plot.identity,
          interpolate: null,
          thresholds: contourThresholds,
          fill: 'value',
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
      ],
    })
  })
