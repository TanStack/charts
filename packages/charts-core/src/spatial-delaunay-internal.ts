import { Delaunay } from 'd3-delaunay'
import { compareChartKey } from './scales'
import type { ChartKey } from './types'

export interface DelaunayPosition {
  readonly x: number
  readonly y: number
}

export interface DelaunayIdentityPosition extends DelaunayPosition {
  readonly key: ChartKey
  readonly sourceIndex: number
}

/** Orders topology inputs by stable identity and keeps one row per exact position. */
export function canonicalDelaunayPoints<
  TPoint extends DelaunayIdentityPosition,
>(points: readonly TPoint[]): readonly TPoint[] {
  const ordered = [...points].sort(comparePointIdentity)
  const seen = new Map<number, Set<number>>()

  return ordered.filter((point) => {
    const yValues = seen.get(point.x)
    if (yValues?.has(point.y)) return false
    if (yValues) yValues.add(point.y)
    else seen.set(point.x, new Set([point.y]))
    return true
  })
}

export function createDelaunay<TPoint extends DelaunayPosition>(
  points: readonly TPoint[],
): Delaunay<TPoint> {
  return Delaunay.from(
    points,
    (point) => point.x,
    (point) => point.y,
  )
}

/** Derives adjacency from triangle and hull edges. */
export function delaunayNeighborIndexes<TPoint extends DelaunayPosition>(
  delaunay: Delaunay<TPoint>,
  pointCount: number,
  includeDegenerateTriangles = false,
): readonly (readonly number[])[] {
  const adjacency = Array.from({ length: pointCount }, () => new Set<number>())
  const addEdge = (source: number, target: number) => {
    if (
      source < 0 ||
      target < 0 ||
      source >= pointCount ||
      target >= pointCount ||
      source === target
    ) {
      return
    }
    adjacency[source]!.add(target)
    adjacency[target]!.add(source)
  }
  const { triangles, hull } = delaunay
  const collinear = (delaunay as Delaunay<TPoint> & { collinear?: Int32Array })
    .collinear
  if (collinear) {
    for (let index = 1; index < collinear.length; index += 1) {
      addEdge(collinear[index - 1]!, collinear[index]!)
    }
  }
  if (!collinear || includeDegenerateTriangles) {
    for (let index = 0; index < triangles.length; index += 3) {
      const first = triangles[index]!
      const second = triangles[index + 1]!
      const third = triangles[index + 2]!
      addEdge(first, second)
      addEdge(second, third)
      addEdge(third, first)
    }
    for (let index = 0; index < hull.length; index += 1) {
      addEdge(hull[index]!, hull[(index + 1) % hull.length]!)
    }
  }
  return adjacency.map((neighbors) => [...neighbors])
}

/** Orders triangle-and-hull adjacency counterclockwise around each site. */
export function angularDelaunayNeighborIndexes<TPoint extends DelaunayPosition>(
  delaunay: Delaunay<TPoint>,
  pointCount: number,
  includeDegenerateTriangles = false,
): readonly (readonly number[])[] {
  const { points } = delaunay
  return delaunayNeighborIndexes(
    delaunay,
    pointCount,
    includeDegenerateTriangles,
  ).map((neighbors, source) =>
    [...neighbors].sort(
      (left, right) =>
        Math.atan2(
          points[left * 2 + 1]! - points[source * 2 + 1]!,
          points[left * 2]! - points[source * 2]!,
        ) -
        Math.atan2(
          points[right * 2 + 1]! - points[source * 2 + 1]!,
          points[right * 2]! - points[source * 2]!,
        ),
    ),
  )
}

/** Returns each undirected neighbor pair once for final-screen positions. */
export function delaunayNeighborPairs(
  points: readonly DelaunayPosition[],
): readonly (readonly [number, number])[] {
  if (points.length < 2) return []
  const delaunay = createDelaunay(points)
  const pairs: (readonly [number, number])[] = []
  const neighbors = delaunayNeighborIndexes(delaunay, points.length)

  for (let source = 0; source < points.length; source += 1) {
    for (const target of neighbors[source]!) {
      if (target <= source) continue
      pairs.push([source, target])
    }
  }

  return pairs
}

function comparePointIdentity(
  left: DelaunayIdentityPosition,
  right: DelaunayIdentityPosition,
): number {
  return (
    compareChartKey(left.key, right.key) || left.sourceIndex - right.sourceIndex
  )
}
