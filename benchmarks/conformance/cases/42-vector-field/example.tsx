import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, vector } from '@tanstack/charts'
import { wind } from '@tanstack/charts-data/wind'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { sampleWind } from './selection'

const speed = scaleSqrt().domain([0, 14]).range([0, 22])
const sampledWind = sampleWind(wind)

export const createExampleChart = () =>
  defineChart(
    {
      marks: [
        vector(sampledWind, {
          id: 'wind-vectors',
          x: 'longitude',
          y: 'latitude',
          length: (row) => speed(Math.hypot(row.u, row.v)),
          rotate: (row) => (Math.atan2(row.u, row.v) * 180) / Math.PI,
          stroke: '#2563eb',
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { label: 'Longitude' } },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Latitude' } },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )

export const exampleAriaLabel = 'Two-dimensional vector field'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
