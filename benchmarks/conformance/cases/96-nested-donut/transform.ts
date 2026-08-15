import type { FlareRow } from '@tanstack/charts-data/flare'

export interface FlareDonutSlice {
  name: string
  size: number
}

export interface FlareDonutDetail extends FlareDonutSlice {
  family: string
}

export interface FlareDonutData {
  inner: readonly FlareDonutSlice[]
  outer: readonly FlareDonutDetail[]
}

interface DetailGroup {
  name: string
  family: string
  includes: (name: string) => boolean
}

const detailGroups: readonly DetailGroup[] = [
  {
    name: 'flare.animate.core',
    family: 'flare.animate',
    includes: (name) =>
      name.startsWith('flare.animate.') &&
      !name.startsWith('flare.animate.interpolate.'),
  },
  {
    name: 'flare.animate.interpolate',
    family: 'flare.animate',
    includes: (name) => name.startsWith('flare.animate.interpolate.'),
  },
  {
    name: 'flare.data.core',
    family: 'flare.data',
    includes: (name) =>
      name.startsWith('flare.data.') &&
      !name.startsWith('flare.data.converters.'),
  },
  {
    name: 'flare.data.converters',
    family: 'flare.data',
    includes: (name) => name.startsWith('flare.data.converters.'),
  },
]

export function nestedFlareDonut(rows: readonly FlareRow[]): FlareDonutData {
  const leaves = rows.filter(
    (row): row is FlareRow & { readonly size: number } => row.size !== null,
  )
  const outer = detailGroups.map((group) => ({
    name: group.name,
    family: group.family,
    size: leaves.reduce(
      (total, row) => total + (group.includes(row.name) ? row.size : 0),
      0,
    ),
  }))
  const inner = ['flare.animate', 'flare.data'].map((family) => ({
    name: family,
    size: outer.reduce(
      (total, detail) => total + (detail.family === family ? detail.size : 0),
      0,
    ),
  }))

  return { inner, outer }
}
