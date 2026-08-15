import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { westportHouse } from '@tanstack/charts-data/westport-house'
import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoIdentity } from 'd3-geo'

const strokes = ['#1e293b', '#2563eb']

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
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
    },
    {
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
    },
  )
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Westport House floor plan'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
