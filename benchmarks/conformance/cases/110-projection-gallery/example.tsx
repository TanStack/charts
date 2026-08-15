import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, facetChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import {
  previewWorldLand,
  worldLand,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import { projectionGalleryData } from './projection'

const projectionColors = [
  ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'],
  ['#1d4ed8', '#6d28d9', '#0e7490', '#c2410c'],
]

export const createExampleChart = (input: ChartOptions) => {
  const preview = false

  const projections = projectionGalleryData()
  const color = {
    domain: projections.map(({ id }) => id),
    range: projectionColors[input.revision % 2] ?? projectionColors[0],
  }

  return defineChart(
    facetChart(projections, {
      id: 'projection-gallery',
      by: 'id',
      columns: 2,
      gap: 0,
      label: false,
      chart: ([entry]) => {
        const projection = {
          type: preview ? () => entry.create().precision(2) : entry.create,
          fit: 'sphere' as const,
          inset: 8,
        }

        return {
          marks: [
            geoShape([worldSphere], {
              id: 'sphere',
              projection,
              fill: 'none',
              stroke: 'currentColor',
              strokeOpacity: 0.5,
              strokeWidth: 0.8,
            }),
            geoShape([preview ? previewWorldLand : worldLand], {
              id: 'land',
              projection,
              color: () => entry.id,
              fillOpacity: 0.78,
              stroke: 'currentColor',
              strokeOpacity: 0.28,
              strokeWidth: 0.45,
            }),
          ],
          color,
          guides: false,
          margin: 0,
        }
      },
    }),
    {
      keyboard: true,
      tooltip: exampleTooltip,
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Standard world projection gallery'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
