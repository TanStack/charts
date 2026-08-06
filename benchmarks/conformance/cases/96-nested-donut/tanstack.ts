import { flare } from '@charts-poc/demo-data/flare'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { nestedFlareDonut } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const names = [
  'flare.animate',
  'flare.data',
  'flare.animate.core',
  'flare.animate.interpolate',
  'flare.data.core',
  'flare.data.converters',
]
const colors = [
  '#38bdf8',
  '#8b5cf6',
  '#0284c7',
  '#0ea5e9',
  '#7c3aed',
  '#a855f7',
]

export const nestedDonutDefinition = (input: ConformanceInput) => {
  const sourceRows =
    input.revision % 2 === 0
      ? flare
      : flare.filter((row) => row.size === null || row.size >= 1_000)
  const data = nestedFlareDonut(sourceRows)
  const innerArcs = pie(data.inner, { value: 'size' })
  const outerArcs = pie(data.outer, { value: 'size' })

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(innerArcs, {
            id: 'family-slices',
            key: 'name',
            innerRadius: ({ radius }) => radius * 0.12,
            outerRadius: ({ radius }) => radius * 0.46,
            color: 'name',
          }),
          radialArc(outerArcs, {
            id: 'detail-slices',
            key: 'name',
            innerRadius: ({ radius }) => radius * 0.56,
            color: 'name',
          }),
        ],
      }),
    ],
    color: { domain: names, range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(
  nestedDonutDefinition,
  'Nested Flare package sizes',
)
