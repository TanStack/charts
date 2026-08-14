import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { angleGrid, polar, radialDot, radialGrid } from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { windDirection, windLatitudeBand, windSpeed } from './transform'

const angleDomain = [0, 360] as const
const radiusDomain = [0, 13] as const
const angleGridValues = [0, 45, 90, 135, 180, 225, 270, 315] as const
const radiusGridValues = [3, 6, 9, 12] as const
const dotColor = '#e11d48'
const gridColor = '#94a3b8'

export const definition = (input: ExampleOptions) => {
  const rows = windLatitudeBand(input.revision)

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.72,
        angle: { scale: scaleLinear().domain(angleDomain) },
        radius: { scale: scaleLinear().domain(radiusDomain) },
        guides: [
          radialGrid({
            values: radiusGridValues,
            labels: false,
            stroke: gridColor,
            strokeOpacity: 0.35,
          }),
          angleGrid({
            values: angleGridValues,
            labels: false,
            stroke: gridColor,
            strokeOpacity: 0.35,
          }),
        ],
        marks: [
          radialDot(rows, {
            angle: windDirection,
            radius: windSpeed,
            r: 4.5,
            fill: dotColor,
            stroke: '#ffffff',
            strokeWidth: 1,
          }),
        ],
      }),
    ],
    margin: 0,
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Surface wind polar scatter'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.latitude}°N, ${datum.longitude}°E · ${windSpeed(datum).toFixed(1)} m/s`,
      },
    },
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
