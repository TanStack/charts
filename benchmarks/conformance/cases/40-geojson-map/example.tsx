import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { westportHouse } from '@charts-poc/demo-data/westport-house'
import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoIdentity } from 'd3-geo'

const strokes = ['#1e293b', '#2563eb']

export const definition = (input: ExampleOptions) =>
  defineChart({
    marks: [
      geoShape(westportHouse.features, {
        key: (feature) => feature.properties.id,
        projection: {
          type: geoIdentity,
          fit: westportHouse,
        },
        fill: 'none',
        stroke: strokes[input.revision % 2] ?? strokes[0],
        strokeWidth: 1,
      }),
    ],
    margin: 10,
  })
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Westport House floor plan'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          datum.properties.name ??
          datum.properties.roomnumber ??
          datum.properties.type.replaceAll('_', ' '),
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
