import * as Plot from '@observablehq/plot'
import { contourColor, contourGrid, contourThresholds } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

interface PlotContour {
  value: number
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const grid = contourGrid(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 12,
      ariaLabel: 'Filled topographic contours',
      x: { axis: null },
      y: { axis: null },
      marks: [
        Plot.contour(grid.values, {
          width: grid.width,
          height: grid.height,
          value: Plot.identity,
          interpolate: null,
          thresholds: contourThresholds,
          fill: (contour: PlotContour) => contourColor(contour.value),
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
      ],
    })
  })
