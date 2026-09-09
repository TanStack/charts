import { resolveRectCornerRadii } from './renderer-rect'
import type { RectCornerRadii } from './types'

export { rectCornerRadiiPath, resolveRectCornerRadii } from './renderer-rect'

const fullTurn = Math.PI * 2

export function containsRectCornerRadii(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadii: RectCornerRadii,
  pointX: number,
  pointY: number,
): boolean {
  const bounds = rectBounds(x, y, width, height)
  const left = bounds.x
  const top = bounds.y
  const right = left + bounds.width
  const bottom = top + bounds.height
  if (!(
    pointX >= left &&
    pointX <= right &&
    pointY >= top &&
    pointY <= bottom
  )) {
    return false
  }

  const [topLeft, topRight, bottomRight, bottomLeft] = resolveRectCornerRadii(
    cornerRadii,
    bounds.width,
    bounds.height,
  )
  if (pointX < left + topLeft && pointY < top + topLeft) {
    return insideCircle(pointX, pointY, left + topLeft, top + topLeft, topLeft)
  }
  if (pointX > right - topRight && pointY < top + topRight) {
    return insideCircle(
      pointX,
      pointY,
      right - topRight,
      top + topRight,
      topRight,
    )
  }
  if (pointX > right - bottomRight && pointY > bottom - bottomRight) {
    return insideCircle(
      pointX,
      pointY,
      right - bottomRight,
      bottom - bottomRight,
      bottomRight,
    )
  }
  if (pointX < left + bottomLeft && pointY > bottom - bottomLeft) {
    return insideCircle(
      pointX,
      pointY,
      left + bottomLeft,
      bottom - bottomLeft,
      bottomLeft,
    )
  }
  return true
}

export function squaredDistanceToRectCornerRadii(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadii: RectCornerRadii,
  pointX: number,
  pointY: number,
): number {
  if (
    containsRectCornerRadii(x, y, width, height, cornerRadii, pointX, pointY)
  ) {
    return 0
  }

  const bounds = rectBounds(x, y, width, height)
  const left = bounds.x
  const top = bounds.y
  const right = left + bounds.width
  const bottom = top + bounds.height
  const [topLeft, topRight, bottomRight, bottomLeft] = resolveRectCornerRadii(
    cornerRadii,
    bounds.width,
    bounds.height,
  )

  return Math.min(
    squaredDistanceToSegment(
      left + topLeft,
      top,
      right - topRight,
      top,
      pointX,
      pointY,
    ),
    squaredDistanceToSegment(
      right,
      top + topRight,
      right,
      bottom - bottomRight,
      pointX,
      pointY,
    ),
    squaredDistanceToSegment(
      right - bottomRight,
      bottom,
      left + bottomLeft,
      bottom,
      pointX,
      pointY,
    ),
    squaredDistanceToSegment(
      left,
      bottom - bottomLeft,
      left,
      top + topLeft,
      pointX,
      pointY,
    ),
    squaredDistanceToArc(
      pointX,
      pointY,
      left + topLeft,
      top + topLeft,
      topLeft,
      Math.PI,
      Math.PI * 1.5,
    ),
    squaredDistanceToArc(
      pointX,
      pointY,
      right - topRight,
      top + topRight,
      topRight,
      Math.PI * 1.5,
      fullTurn,
    ),
    squaredDistanceToArc(
      pointX,
      pointY,
      right - bottomRight,
      bottom - bottomRight,
      bottomRight,
      0,
      Math.PI * 0.5,
    ),
    squaredDistanceToArc(
      pointX,
      pointY,
      left + bottomLeft,
      bottom - bottomLeft,
      bottomLeft,
      Math.PI * 0.5,
      Math.PI,
    ),
  )
}

function rectBounds(x: number, y: number, width: number, height: number) {
  const right = x + width
  const bottom = y + height
  return {
    x: Math.min(x, right),
    y: Math.min(y, bottom),
    width: Math.abs(width),
    height: Math.abs(height),
  }
}

function insideCircle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
): boolean {
  const dx = x - centerX
  const dy = y - centerY
  return dx * dx + dy * dy <= radius * radius
}

function squaredDistanceToArc(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): number {
  if (radius === 0) return squaredDistance(x, y, centerX, centerY)
  let angle = Math.atan2(y - centerY, x - centerX)
  if (angle < 0) angle += fullTurn
  if (angle >= startAngle && angle <= endAngle) {
    const centerDistance = Math.hypot(x - centerX, y - centerY)
    return (centerDistance - radius) ** 2
  }
  return Math.min(
    squaredDistance(
      x,
      y,
      centerX + Math.cos(startAngle) * radius,
      centerY + Math.sin(startAngle) * radius,
    ),
    squaredDistance(
      x,
      y,
      centerX + Math.cos(endAngle) * radius,
      centerY + Math.sin(endAngle) * radius,
    ),
  )
}

function squaredDistanceToSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return squaredDistance(x, y, x1, y1)
  const amount = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
  )
  return squaredDistance(x, y, x1 + amount * dx, y1 + amount * dy)
}

function squaredDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2
}
