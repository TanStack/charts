import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { dayOfYearAngle, seattleWeatherYear } from './transform'

const angleDomain = [0, 360] as const
const radiusDomain = [-10, 40] as const
const angleGridValues = [0, 45, 90, 135, 180, 225, 270, 315] as const
const radiusGridValues = [0, 10, 20, 30, 40] as const
const lineColor = '#0f766e'
const gridColor = '#94a3b8'

export const definition = (input: ExampleOptions) => {
  const rows = seattleWeatherYear(input.revision)

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
          radialLine(rows, {
            angle: dayOfYearAngle,
            radius: 'temp_max',
            stroke: lineColor,
            strokeWidth: 2.5,
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

export const exampleAriaLabel = 'Seattle daily high-temperature polar line'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.date.toISOString().slice(0, 10)} · ${datum.temp_max}°C high`,
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
