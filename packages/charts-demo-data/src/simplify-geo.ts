import type { GeoGeometryObjects } from 'd3-geo'

type PolygonGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>
type Position = number[]

export function simplifyPolygonGeometry(
  geometry: PolygonGeometry,
  tolerance: number,
): PolygonGeometry {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) =>
        simplifyRing(ring, tolerance),
      ),
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map((ring) => simplifyRing(ring, tolerance)),
    ),
  }
}

function simplifyRing(
  ring: readonly Position[],
  tolerance: number,
): Position[] {
  if (ring.length <= 4) return [...ring]

  const openRing = ring.slice(0, -1)
  const anchor = openRing[0]
  if (!anchor) return [...ring]

  let splitIndex = 1
  let farthestDistance = 0
  for (let index = 1; index < openRing.length; index += 1) {
    const point = openRing[index]
    if (!point) continue
    const distance = squaredDistance(anchor, point)
    if (distance > farthestDistance) {
      farthestDistance = distance
      splitIndex = index
    }
  }

  const firstHalf = simplifyLine(
    openRing.slice(0, splitIndex + 1),
    tolerance * tolerance,
  )
  const secondHalf = simplifyLine(
    [...openRing.slice(splitIndex), anchor],
    tolerance * tolerance,
  )
  const simplified = [...firstHalf.slice(0, -1), ...secondHalf]

  return simplified.length >= 4 ? simplified : [...ring]
}

function simplifyLine(
  points: readonly Position[],
  squaredTolerance: number,
): Position[] {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length <= 2) return [...points]

  let farthestIndex = 0
  let farthestDistance = squaredTolerance
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    if (!point) continue
    const distance = squaredSegmentDistance(point, first, last)
    if (distance > farthestDistance) {
      farthestDistance = distance
      farthestIndex = index
    }
  }

  if (farthestIndex === 0) return [first, last]

  const left = simplifyLine(
    points.slice(0, farthestIndex + 1),
    squaredTolerance,
  )
  const right = simplifyLine(points.slice(farthestIndex), squaredTolerance)
  return [...left.slice(0, -1), ...right]
}

function squaredSegmentDistance(
  point: Position,
  start: Position,
  end: Position,
): number {
  const [pointX = 0, pointY = 0] = point
  let [x = 0, y = 0] = start
  const [endX = 0, endY = 0] = end
  let dx = endX - x
  let dy = endY - y

  if (dx !== 0 || dy !== 0) {
    const progress =
      ((pointX - x) * dx + (pointY - y) * dy) / (dx * dx + dy * dy)
    if (progress > 1) {
      x = endX
      y = endY
    } else if (progress > 0) {
      x += dx * progress
      y += dy * progress
    }
    dx = pointX - x
    dy = pointY - y
  } else {
    dx = pointX - x
    dy = pointY - y
  }

  return dx * dx + dy * dy
}

function squaredDistance(left: Position, right: Position): number {
  const dx = (left[0] ?? 0) - (right[0] ?? 0)
  const dy = (left[1] ?? 0) - (right[1] ?? 0)
  return dx * dx + dy * dy
}
