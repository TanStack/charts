import {
  angularDelaunayNeighborIndexes,
  createDelaunay,
} from './spatial-delaunay-internal'
import type { DelaunayPosition } from './spatial-delaunay-internal'
import type { ChartBounds } from './types'

export interface VoronoiCellPolygon {
  readonly pointIndex: number
  readonly points: readonly (readonly [number, number])[]
}

interface IndexedPosition {
  readonly pointIndex: number
  readonly position: DelaunayPosition
}

type MutablePoint = [number, number]

/**
 * Returns nondegenerate Voronoi cells clipped to positive final plot bounds.
 * Exact coincident sites share one cell; all other sites remain distinct.
 */
export function voronoiCellPolygons(
  positions: readonly DelaunayPosition[],
  bounds: ChartBounds,
): readonly VoronoiCellPolygon[] {
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height)
  ) {
    throw new TypeError('voronoi: chart bounds must be finite')
  }
  if (positions.length === 0 || bounds.width <= 0 || bounds.height <= 0) {
    return []
  }

  const xMaximum = bounds.x + bounds.width
  const yMaximum = bounds.y + bounds.height
  if (
    !Number.isFinite(xMaximum) ||
    !Number.isFinite(yMaximum) ||
    xMaximum <= bounds.x ||
    yMaximum <= bounds.y
  ) {
    throw new TypeError('voronoi: chart bounds must have representable extents')
  }
  if (
    positions.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))
  ) {
    throw new TypeError('voronoi: site positions must be finite')
  }

  const offsets = positions.map(({ x, y }) => ({
    x: x - bounds.x,
    y: y - bounds.y,
  }))
  if (offsets.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new TypeError(
      'voronoi: site offsets from chart bounds must be finite',
    )
  }
  const indexed = uniquePositions(offsets)
  if (indexed.length === 1) {
    return [
      {
        pointIndex: indexed[0]!.pointIndex,
        points: [
          [xMaximum, bounds.y],
          [xMaximum, yMaximum],
          [bounds.x, yMaximum],
          [bounds.x, bounds.y],
        ],
      },
    ]
  }
  const first = indexed[0]!.position
  let xMinimum = first.x
  let xMaximumPosition = first.x
  let yMinimum = first.y
  let yMaximumPosition = first.y
  for (const { position } of indexed.slice(1)) {
    xMinimum = Math.min(xMinimum, position.x)
    xMaximumPosition = Math.max(xMaximumPosition, position.x)
    yMinimum = Math.min(yMinimum, position.y)
    yMaximumPosition = Math.max(yMaximumPosition, position.y)
  }
  const xOrigin = xMinimum / 2 + xMaximumPosition / 2
  const yOrigin = yMinimum / 2 + yMaximumPosition / 2
  const dataExtent = Math.max(
    xMaximumPosition - xMinimum,
    yMaximumPosition - yMinimum,
  )
  if (!Number.isFinite(dataExtent)) {
    throw new TypeError('voronoi: site extent exceeds numeric range')
  }
  const coordinateScale =
    dataExtent > 0 ? 2 ** Math.min(1023, Math.floor(Math.log2(dataExtent))) : 1
  const localBounds = {
    x: -xOrigin / coordinateScale,
    y: -yOrigin / coordinateScale,
    width: bounds.width / coordinateScale,
    height: bounds.height / coordinateScale,
  }
  const localWidth = localBounds.x + localBounds.width - localBounds.x
  const localHeight = localBounds.y + localBounds.height - localBounds.y
  const hasRepresentableLocalBounds = !(
    !Number.isFinite(localBounds.x) ||
    !Number.isFinite(localBounds.y) ||
    !Number.isFinite(localBounds.width) ||
    !Number.isFinite(localBounds.height) ||
    localBounds.width === 0 ||
    localBounds.height === 0 ||
    localWidth === 0 ||
    localHeight === 0 ||
    Math.abs(localWidth - localBounds.width) > localBounds.width * 1e-8 ||
    Math.abs(localHeight - localBounds.height) > localBounds.height * 1e-8
  )
  const unique = indexed.map((entry) => ({
    ...entry,
    position: {
      x: (entry.position.x - xOrigin) / coordinateScale,
      y: (entry.position.y - yOrigin) / coordinateScale,
    },
  }))
  const delaunay = createDelaunay(unique.map((entry) => entry.position))
  const neighbors = angularDelaunayNeighborIndexes(
    delaunay,
    unique.length,
    true,
  )
  if (hasRepresentableLocalBounds) {
    const diagram = delaunay.voronoi([
      localBounds.x,
      localBounds.y,
      localBounds.x + localBounds.width,
      localBounds.y + localBounds.height,
    ])
    let cells = readD3Cells(diagram, unique)
    if (!isValidPartition(cells, localBounds, unique, neighbors)) {
      cells = buildCells(unique, localBounds, neighbors)
    }
    if (!isValidPartition(cells, localBounds, unique, neighbors)) {
      cells = buildCells(unique, localBounds, neighbors, true)
    }
    if (isValidPartition(cells, localBounds, unique, neighbors)) {
      return translateCells(
        cells,
        bounds.x + xOrigin,
        bounds.y + yOrigin,
        coordinateScale,
        bounds,
        offsets,
      )
    }
  }

  const plotBounds = { x: 0, y: 0, width: bounds.width, height: bounds.height }
  let resolved = buildCells(indexed, plotBounds, neighbors)
  if (!isValidPartition(resolved, plotBounds, indexed, neighbors)) {
    resolved = buildCells(indexed, plotBounds, neighbors, true)
  }
  if (!isValidPartition(resolved, plotBounds, indexed, neighbors)) {
    throw new TypeError('voronoi: could not generate a valid cell partition')
  }
  return translateCells(resolved, bounds.x, bounds.y, 1, bounds, offsets)
}

function translateCells(
  cells: readonly VoronoiCellPolygon[],
  xOffset: number,
  yOffset: number,
  coordinateScale: number,
  bounds: ChartBounds,
  sourceOffsets: readonly DelaunayPosition[],
): readonly VoronoiCellPolygon[] {
  const xMaximum = bounds.x + bounds.width
  const yMaximum = bounds.y + bounds.height
  return cells.flatMap((cell) => {
    const points = normalizePolygon(
      cell.points.map(
        ([x, y]) =>
          [
            Math.max(
              bounds.x,
              Math.min(xMaximum, x * coordinateScale + xOffset),
            ),
            Math.max(
              bounds.y,
              Math.min(yMaximum, y * coordinateScale + yOffset),
            ),
          ] as const,
      ),
    )
    if (points.length < 3 || polygonArea(points) === 0) {
      const site = sourceOffsets[cell.pointIndex]!
      if (
        site.x < 0 ||
        site.x > bounds.width ||
        site.y < 0 ||
        site.y > bounds.height
      ) {
        return []
      }
      throw new TypeError(
        'voronoi: cell boundaries are not representable in chart coordinates',
      )
    }
    return [{ pointIndex: cell.pointIndex, points }]
  })
}

function uniquePositions(
  positions: readonly DelaunayPosition[],
): readonly IndexedPosition[] {
  const seen = new Map<number, Set<number>>()

  return positions.flatMap((position, pointIndex) => {
    const yValues = seen.get(position.x)
    if (yValues?.has(position.y)) return []
    if (yValues) yValues.add(position.y)
    else seen.set(position.x, new Set([position.y]))
    return [{ position, pointIndex }]
  })
}

function readD3Cells(
  diagram: ReturnType<ReturnType<typeof createDelaunay>['voronoi']>,
  positions: readonly IndexedPosition[],
): VoronoiCellPolygon[] {
  return positions.flatMap(({ pointIndex }, diagramIndex) => {
    const closed = diagram.cellPolygon(diagramIndex) as
      readonly (readonly [number, number])[] | null | undefined
    const points = normalizePolygon(closed ?? [])
    return points.length >= 3 && polygonArea(points) !== 0
      ? [{ pointIndex, points }]
      : []
  })
}

function buildCells(
  positions: readonly IndexedPosition[],
  bounds: ChartBounds,
  neighbors: readonly (readonly number[])[],
  allCompetitors = false,
): VoronoiCellPolygon[] {
  const xMaximum = bounds.x + bounds.width
  const yMaximum = bounds.y + bounds.height
  const rectangle: readonly MutablePoint[] = [
    [xMaximum, bounds.y],
    [xMaximum, yMaximum],
    [bounds.x, yMaximum],
    [bounds.x, bounds.y],
  ]

  return positions.flatMap((entry, index) => {
    let points = rectangle.map(([x, y]): MutablePoint => [x, y])
    const competitors = allCompetitors ? positions.keys() : neighbors[index]!
    for (const competitorIndex of competitors) {
      if (competitorIndex === index) continue
      if (competitorIndex < 0 || competitorIndex >= positions.length) continue
      points = clipToCloserHalfPlane(
        points,
        entry.position,
        positions[competitorIndex]!.position,
      )
      if (points.length < 3) return []
    }
    const normalized = normalizePolygon(
      points.map(
        ([x, y]) =>
          [
            Math.max(bounds.x, Math.min(xMaximum, x)),
            Math.max(bounds.y, Math.min(yMaximum, y)),
          ] as const,
      ),
    )
    return normalized.length >= 3 && polygonArea(normalized) !== 0
      ? [{ pointIndex: entry.pointIndex, points: normalized }]
      : []
  })
}

function clipToCloserHalfPlane(
  polygon: readonly MutablePoint[],
  site: DelaunayPosition,
  competitor: DelaunayPosition,
): MutablePoint[] {
  if (polygon.length === 0) return []
  const xDelta = competitor.x - site.x
  const yDelta = competitor.y - site.y
  if (xDelta === 0 && yDelta === 0) return [...polygon]
  const output: MutablePoint[] = []
  let previous = polygon.at(-1)!
  let previousDistance = signedBisectorDistance(previous, site, competitor)

  for (const current of polygon) {
    const currentDistance = signedBisectorDistance(current, site, competitor)
    const previousInside = previousDistance <= 0
    const currentInside = currentDistance <= 0
    if (previousInside !== currentInside) {
      const ratio = previousDistance / (previousDistance - currentDistance)
      output.push([
        previous[0] + ratio * (current[0] - previous[0]),
        previous[1] + ratio * (current[1] - previous[1]),
      ])
    }
    if (currentInside) output.push(current)
    previous = current
    previousDistance = currentDistance
  }

  return output
}

function signedBisectorDistance(
  [x, y]: readonly [number, number],
  site: DelaunayPosition,
  competitor: DelaunayPosition,
): number {
  const xDelta = competitor.x - site.x
  const yDelta = competitor.y - site.y
  const xMidpoint = site.x / 2 + competitor.x / 2
  const yMidpoint = site.y / 2 + competitor.y / 2
  return (x - xMidpoint) * xDelta + (y - yMidpoint) * yDelta
}

function normalizePolygon(
  polygon: readonly (readonly [number, number])[],
): readonly (readonly [number, number])[] {
  const points: (readonly [number, number])[] = []
  const seen = new Set<string>()
  for (const point of polygon) {
    const key = JSON.stringify(point)
    if (seen.has(key)) continue
    seen.add(key)
    points.push([point[0], point[1]])
  }
  return points
}

function isValidPartition(
  cells: readonly VoronoiCellPolygon[],
  bounds: ChartBounds,
  positions: readonly IndexedPosition[],
  neighbors: readonly (readonly number[])[],
): boolean {
  if (cells.length === 0) return false
  const positionIndexes = new Map(
    positions.map(({ pointIndex }, index) => [pointIndex, index]),
  )
  const cellIndexes = new Set<number>()
  const expectedArea = bounds.width * bounds.height
  const crossTolerance = expectedArea * Number.EPSILON * 4096
  const ownershipTolerance = Math.max(bounds.width, bounds.height) * 1e-8
  let totalArea = 0

  for (const cell of cells) {
    const positionIndex = positionIndexes.get(cell.pointIndex)
    if (
      positionIndex === undefined ||
      cellIndexes.has(positionIndex) ||
      cell.points.length < 3 ||
      !polygonIsConvex(cell.points, crossTolerance) ||
      cell.points.some(
        ([x, y]) =>
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          x < bounds.x ||
          x > bounds.x + bounds.width ||
          y < bounds.y ||
          y > bounds.y + bounds.height,
      )
    ) {
      return false
    }
    const site = positions[positionIndex]!.position
    if (
      violatesNeighborOwnership(
        cell.points,
        site,
        neighbors[positionIndex]!,
        positions,
        ownershipTolerance,
      )
    ) {
      return false
    }
    const area = Math.abs(polygonArea(cell.points))
    if (area === 0 || !Number.isFinite(area)) return false
    totalArea += area
    cellIndexes.add(positionIndex)
  }

  for (let index = 0; index < positions.length; index += 1) {
    const { x, y } = positions[index]!.position
    if (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height &&
      !cellIndexes.has(index)
    ) {
      return false
    }
  }

  return Math.abs(totalArea - expectedArea) <= expectedArea * 1e-8
}

function violatesNeighborOwnership(
  points: readonly (readonly [number, number])[],
  site: DelaunayPosition,
  competitorIndexes: readonly number[],
  positions: readonly IndexedPosition[],
  tolerance: number,
): boolean {
  if (points.length * competitorIndexes.length <= 4096) {
    return competitorIndexes.some((competitorIndex) => {
      const competitor = positions[competitorIndex]!.position
      const distance = Math.hypot(competitor.x - site.x, competitor.y - site.y)
      return points.some(
        (point) =>
          signedBisectorDistance(point, site, competitor) >
          distance * tolerance,
      )
    })
  }

  const step = polygonArea(points) >= 0 ? 1 : -1
  let vertexIndex = 0
  let initialized = false
  for (const competitorIndex of competitorIndexes) {
    const competitor = positions[competitorIndex]!.position
    const xDelta = competitor.x - site.x
    const yDelta = competitor.y - site.y
    const projection = (index: number) =>
      points[index]![0] * xDelta + points[index]![1] * yDelta
    if (!initialized) {
      for (let index = 1; index < points.length; index += 1) {
        if (projection(index) > projection(vertexIndex)) vertexIndex = index
      }
      initialized = true
    } else {
      for (let advances = 0; advances < points.length; advances += 1) {
        const next = (vertexIndex + step + points.length) % points.length
        if (projection(next) <= projection(vertexIndex)) break
        vertexIndex = next
      }
    }
    if (
      signedBisectorDistance(points[vertexIndex]!, site, competitor) >
      Math.hypot(xDelta, yDelta) * tolerance
    ) {
      return true
    }
  }
  return false
}

function polygonIsConvex(
  points: readonly (readonly [number, number])[],
  tolerance: number,
): boolean {
  let direction = 0
  for (let index = 0; index < points.length; index += 1) {
    const first = points[index]!
    const second = points[(index + 1) % points.length]!
    const third = points[(index + 2) % points.length]!
    const cross =
      (second[0] - first[0]) * (third[1] - second[1]) -
      (second[1] - first[1]) * (third[0] - second[0])
    if (Math.abs(cross) <= tolerance) continue
    const nextDirection = Math.sign(cross)
    if (direction && direction !== nextDirection) return false
    direction = nextDirection
  }
  return true
}

function polygonArea(points: readonly (readonly [number, number])[]): number {
  const origin = points[0]
  if (!origin) return 0
  let area = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]!
    const next = points[index + 1]!
    area +=
      (current[0] - origin[0]) * (next[1] - origin[1]) -
      (current[1] - origin[1]) * (next[0] - origin[0])
  }
  return area / 2
}
