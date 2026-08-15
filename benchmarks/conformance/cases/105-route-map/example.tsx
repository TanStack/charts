import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import {
  detailedWorldLand,
  previewWorldGraticule,
  previewWorldLand,
  worldGraticule,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import { beagleRoute } from './transform'

const routeColors = ['#dc2626', '#2563eb']
const projection = {
  type: () => geoEqualEarth().rotate([-10, 0]),
  fit: 'sphere' as const,
}
const previewProjection = {
  type: () => geoEqualEarth().rotate([-10, 0]).precision(2),
  fit: 'sphere' as const,
}

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
      marks: [
        geoShape([input.preview ? previewWorldLand : detailedWorldLand], {
          projection: input.preview ? previewProjection : projection,
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.5,
        }),
        geoShape([input.preview ? previewWorldGraticule : worldGraticule], {
          projection: input.preview ? previewProjection : projection,
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.2,
          strokeWidth: 0.5,
        }),
        geoShape([beagleRoute], {
          projection: input.preview ? previewProjection : projection,
          fill: 'none',
          stroke: routeColors[input.revision % 2] ?? routeColors[0],
          strokeWidth: 2,
          strokeOpacity: 0.9,
        }),
        geoShape([worldSphere], {
          projection: input.preview ? previewProjection : projection,
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.4,
          strokeWidth: 0.75,
        }),
      ],
      margin: 10,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'HMS Beagle voyage'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
