import { flare } from '@tanstack/charts-data/flare'
import type { FlareRow } from '@tanstack/charts-data/flare'

export const flareRootId = '/flare'
export const flarePreviewRootId = '/flare/analytics'

export interface FlareSunburstTree {
  readonly id: string
  readonly name: string
  readonly value: number
  readonly fill: string
  readonly children?: FlareSunburstTree[]
}

const rowsById = new Map(flare.map((row) => [flareId(row.name), row]))
const childrenById = new Map<string, string[]>()

for (const row of flare) {
  const id = flareId(row.name)
  const parentId = flareParentId(id)
  if (!parentId) continue
  const children = childrenById.get(parentId)
  if (children) children.push(id)
  else childrenById.set(parentId, [id])
}

const aggregateValues = new Map<string, number>()
const heights = new Map<string, number>()

export function flareId(path: string): string {
  return `/${path.replaceAll('.', '/')}`
}

export function flareLabel(id: string): string {
  return rowsById.get(id)?.name.split('.').at(-1) ?? id.split('/').at(-1) ?? id
}

export function flareParentId(id: string): string | null {
  const split = id.lastIndexOf('/')
  return split > 0 ? id.slice(0, split) : null
}

export function flareHasChildren(id: string): boolean {
  return (childrenById.get(id)?.length ?? 0) > 0
}

export function flareAggregateValue(id: string): number {
  const cached = aggregateValues.get(id)
  if (cached !== undefined) return cached
  const own = rowsById.get(id)?.size ?? 0
  const value = (childrenById.get(id) ?? []).reduce(
    (sum, childId) => sum + flareAggregateValue(childId),
    own,
  )
  aggregateValues.set(id, value)
  return value
}

export function flareHeight(id: string): number {
  const cached = heights.get(id)
  if (cached !== undefined) return cached
  const childHeights = (childrenById.get(id) ?? []).map(flareHeight)
  const height = childHeights.length ? Math.max(...childHeights) + 1 : 0
  heights.set(id, height)
  return height
}

export function flareVisibleRingCount(id: string): number {
  return Math.min(flareVisibleDepth(id), flareHeight(id))
}

export function flareVisibleDepth(id: string): number {
  return id === flareRootId ? 1 : 2
}

export function flareSunburstTree(id: string): FlareSunburstTree {
  if (!rowsById.has(id)) throw new TypeError(`Unknown Flare node "${id}"`)
  return treeNode(id, 0, flareVisibleDepth(id))
}

export function flareNodeColor(id: string): string {
  const branch = id.split('/')[2] ?? 'flare'
  const hue = branchHues[branch] ?? 220
  const lightness = 48 + (hash(id) % 4) * 5
  return `hsl(${hue} 70% ${lightness}%)`
}

export function formatFlareValue(value: number): string {
  return `${value.toLocaleString('en-US')} lines`
}

export function flareRows(): readonly FlareRow[] {
  return flare
}

function treeNode(
  id: string,
  depth: number,
  visibleDepth: number,
): FlareSunburstTree {
  const children =
    depth >= visibleDepth
      ? []
      : [...(childrenById.get(id) ?? [])].sort(compareNodes)
  return {
    id,
    name: flareLabel(id),
    value: flareAggregateValue(id),
    fill: flareNodeColor(id),
    ...(children.length
      ? {
          children: children.map((childId) =>
            treeNode(childId, depth + 1, visibleDepth),
          ),
        }
      : {}),
  }
}

function compareNodes(left: string, right: string): number {
  return (
    flareAggregateValue(right) - flareAggregateValue(left) ||
    flareLabel(left).localeCompare(flareLabel(right))
  )
}

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

const branchHues: Readonly<Record<string, number>> = {
  analytics: 263,
  animate: 198,
  data: 36,
  display: 330,
  flex: 152,
  physics: 232,
  query: 18,
  scale: 177,
  util: 87,
  vis: 355,
}
