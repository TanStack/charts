import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { contour } from '@tanstack/charts/spatial/contour'
import { scaleThreshold } from 'd3-scale'
import { contourThresholds, windObservationGrid } from './transform'

const colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

export const createExampleChart = (input: ChartOptions) => {
  const grid = windObservationGrid(input.revision)

  return defineChart(
    {
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
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Filled wind-speed contours'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
