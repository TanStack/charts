import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { penguins } from '@charts-poc/demo-data/penguins'
import { defineChart } from '@tanstack/charts'
import { densityContour } from '@tanstack/charts/spatial/density'
import { scaleLinear } from 'd3-scale'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

type PenguinBill = PenguinsRow & {
  readonly culmen_length_mm: number
  readonly culmen_depth_mm: number
}

const densityBandwidth = 18
export const densityThresholds = [0.0004, 0.0008, 0.0012, 0.0016, 0.002, 0.0024]
export const densityXDomain: [number, number] = [30, 62]
export const densityYDomain: [number, number] = [12, 23]

export const densityDefinition = (input: ExampleOptions) => {
  const points = penguins
    .filter((row): row is PenguinBill => {
      return row.culmen_length_mm !== null && row.culmen_depth_mm !== null
    })
    .slice(input.revision * 8, input.revision * 8 + 320)

  return defineChart({
    marks: [
      densityContour(points, {
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
    x: {
      scale: scaleLinear().domain(densityXDomain),
    },
    y: {
      scale: scaleLinear().domain(densityYDomain),
    },
    guides: false,
    margin: densityBandwidth * 1.5,
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Point density contours'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(densityDefinition(options), {
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
