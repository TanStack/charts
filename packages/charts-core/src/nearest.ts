import type { ChartHitRegion, ChartPoint, ChartValue } from './types'

export function nearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  x: number,
  y: number,
  maxDistance: number,
): ChartPoint<TDatum, TXValue, TYValue> | null {
  let result: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let resultPrimaryDistance = Infinity
  let anchorOnly = true

  // Resolve exact painted containment before considering any nearby fallback.
  for (let index = points.length; index--;) {
    const point = points[index]!
    const region = point.hitRegion
    if (region) {
      anchorOnly = false
      if (contains(region, x, y)) {
        // Scene points follow paint order, so reverse traversal finds topmost first.
        return point
      }
    } else if (point.focusAffinity && point.focusAffinity !== 'xy') {
      anchorOnly = false
    } else {
      const dx = point.x - x
      const dy = point.y - y
      const distance = dx * dx + dy * dy
      // Reverse traversal uses <= so legacy ties still resolve to the first point.
      if (distance <= resultPrimaryDistance) {
        result = point
        resultPrimaryDistance = distance
      }
    }
  }
  if (anchorOnly) {
    return result && resultPrimaryDistance <= Math.max(0, maxDistance) ** 2
      ? result
      : null
  }

  result = undefined
  resultPrimaryDistance = Infinity
  let resultGeometryDistance = Infinity
  for (const point of points) {
    const affinity = point.focusAffinity ?? 'xy'
    if (affinity === 'geometry') continue

    const region = point.hitRegion
    let primaryDistance: number
    let geometryDistance: number
    if (!region) {
      const dx = point.x - x
      const dy = point.y - y
      geometryDistance = dx * dx + dy * dy
      primaryDistance =
        affinity === 'x'
          ? dx * dx
          : affinity === 'y'
            ? dy * dy
            : geometryDistance
    } else {
      primaryDistance =
        affinity === 'x'
          ? squaredAxisDistance(region, x, 0)
          : affinity === 'y'
            ? squaredAxisDistance(region, y, 1)
            : 0
      if (affinity !== 'xy' && primaryDistance > resultPrimaryDistance) {
        continue
      }
      geometryDistance = squaredDistanceToBoundary(region, x, y)
      if (affinity === 'xy') primaryDistance = geometryDistance
    }
    if (
      primaryDistance < resultPrimaryDistance ||
      (primaryDistance === resultPrimaryDistance &&
        geometryDistance < resultGeometryDistance)
    ) {
      result = point
      resultPrimaryDistance = primaryDistance
      resultGeometryDistance = geometryDistance
    }
  }

  return result && resultPrimaryDistance <= Math.max(0, maxDistance) ** 2
    ? result
    : null
}

function contains(region: ChartHitRegion, x: number, y: number) {
  if (region.kind === 'rect') {
    const left = Math.min(region.x, region.x + region.width)
    const right = Math.max(region.x, region.x + region.width)
    const top = Math.min(region.y, region.y + region.height)
    const bottom = Math.max(region.y, region.y + region.height)
    return x >= left && x <= right && y >= top && y <= bottom
  }
  if (region.kind === 'circle') {
    const dx = x - region.x
    const dy = y - region.y
    const radius = Math.max(0, region.radius)
    return dx * dx + dy * dy <= radius * radius
  }

  const points = region.points
  let inside = false
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index++
  ) {
    const current = points[index]!
    const prior = points[previous]!
    if (
      current[1] > y !== prior[1] > y &&
      x <
        ((prior[0] - current[0]) * (y - current[1])) / (prior[1] - current[1]) +
          current[0]
    ) {
      inside = !inside
    }
  }
  return inside
}

function squaredAxisDistance(
  region: ChartHitRegion,
  value: number,
  coordinate: 0 | 1,
) {
  let minimum: number
  let maximum: number
  if (region.kind === 'circle') {
    const center = coordinate === 0 ? region.x : region.y
    const radius = Math.max(0, region.radius)
    minimum = center - radius
    maximum = center + radius
  } else if (region.kind === 'rect') {
    const start = coordinate === 0 ? region.x : region.y
    const size = coordinate === 0 ? region.width : region.height
    minimum = Math.min(start, start + size)
    maximum = Math.max(start, start + size)
  } else {
    minimum = Infinity
    maximum = -Infinity
    for (const vertex of region.points) {
      minimum = Math.min(minimum, vertex[coordinate])
      maximum = Math.max(maximum, vertex[coordinate])
    }
  }
  const distance =
    value < minimum ? minimum - value : value > maximum ? value - maximum : 0
  return distance * distance
}

function squaredDistanceToBoundary(
  region: ChartHitRegion,
  x: number,
  y: number,
) {
  if (region.kind === 'rect') {
    const left = Math.min(region.x, region.x + region.width)
    const right = Math.max(region.x, region.x + region.width)
    const top = Math.min(region.y, region.y + region.height)
    const bottom = Math.max(region.y, region.y + region.height)
    const dx = x < left ? left - x : x > right ? x - right : 0
    const dy = y < top ? top - y : y > bottom ? y - bottom : 0
    return dx * dx + dy * dy
  }
  if (region.kind === 'circle') {
    const dx = x - region.x
    const dy = y - region.y
    const distance = Math.max(
      0,
      Math.sqrt(dx * dx + dy * dy) - Math.max(0, region.radius),
    )
    return distance * distance
  }

  let distance = Infinity
  for (let index = 0; index < region.points.length; index += 1) {
    const start = region.points[index]!
    const end = region.points[(index + 1) % region.points.length]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const length = dx * dx + dy * dy
    const amount = length
      ? Math.max(
          0,
          Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / length),
        )
      : 0
    const offsetX = x - (start[0] + amount * dx)
    const offsetY = y - (start[1] + amount * dy)
    distance = Math.min(distance, offsetX * offsetX + offsetY * offsetY)
  }
  return distance
}
