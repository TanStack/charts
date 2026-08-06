import { defineChart } from '@tanstack/charts'
import { contour } from '@tanstack/charts/spatial/contour'
import { scaleThreshold } from 'd3-scale'
import { contourThresholds, windObservationGrid } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

export const contourDefinition = (input: ConformanceInput) => {
  const grid = windObservationGrid(input.revision)

  return defineChart({
    marks: [
      contour(grid.data, {
        width: grid.width,
        height: grid.height,
        value: (row) => Math.hypot(row.u, row.v),
        thresholds: contourThresholds,
        stroke: '#ffffff',
        strokeWidth: 0.75,
      }),
    ],
    color: {
      scale: scaleThreshold<number, string>,
      domain: contourThresholds.slice(1),
      range: colors,
    },
    margin: 12,
  })
}

export const mount = tanstackMount(
  contourDefinition,
  'Filled wind-speed contours',
)
