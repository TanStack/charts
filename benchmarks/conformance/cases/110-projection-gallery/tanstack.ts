import { facetChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import {
  previewWorldLand,
  worldLand,
  worldSphere,
} from '../../shared/fixtures/country-atlas'
import { projectionGalleryData } from './projection'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const projectionColors = [
  ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'],
  ['#1d4ed8', '#6d28d9', '#0e7490', '#c2410c'],
]

function projectionGalleryChart(input: ConformanceInput, preview: boolean) {
  const projections = projectionGalleryData()
  const color = {
    domain: projections.map(({ id }) => id),
    range: projectionColors[input.revision % 2] ?? projectionColors[0],
  }

  return facetChart(projections, {
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
  })
}

export const projectionGalleryDefinition = (input: ConformanceInput) =>
  projectionGalleryChart(input, false)

const catalogProjectionGalleryDefinition = (input: ConformanceInput) =>
  projectionGalleryChart(input, input.preview === true)

export const mount = tanstackMount(
  projectionGalleryDefinition,
  'Standard world projection gallery',
)

export const catalogCase = tanstackCase(
  catalogProjectionGalleryDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
