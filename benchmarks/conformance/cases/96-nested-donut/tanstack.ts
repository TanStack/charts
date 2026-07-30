import { flare } from '@charts-poc/demo-data/flare'
import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { nestedFlareDonut } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { FlareDonutSlice } from './transform'
import type { ConformanceInput } from '../../types'

const innerLayout = pie<FlareDonutSlice>()
  .sort(null)
  .value(({ size }) => size)
const outerLayout = pie<FlareDonutSlice>()
  .sort(null)
  .value(({ size }) => size)
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

const definition = (input: ConformanceInput) => {
  const sourceRows =
    input.revision % 2 === 0
      ? flare
      : flare.filter((row) => row.size === null || row.size >= 1_000)
  const data = nestedFlareDonut(sourceRows)
  const innerArcs = innerLayout([...data.inner])
  const outerArcs = outerLayout([...data.outer])

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        marks: [
          radialArc(innerArcs, {
            innerRadius: ({ radius }) => radius * 0.12,
            outerRadius: ({ radius }) => radius * 0.46,
            color: ({ data }) => data.name,
          }),
          radialArc(outerArcs, {
            innerRadius: ({ radius }) => radius * 0.56,
            color: ({ data }) => data.name,
          }),
        ],
      }),
    ],
    color: { domain: names, range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'Nested Flare package sizes')
