import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { contour } from '@tanstack/charts/spatial/contour'
import { scaleThreshold } from 'd3-scale'
import { contourThresholds, windObservationGrid } from './transform'

const colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

export const contourDefinition = (input: ExampleOptions) => {
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
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Filled wind-speed contours'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(contourDefinition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
