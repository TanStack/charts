import type { RectCornerRadii } from './types'

/** Resolve radii in top-left, top-right, bottom-right, bottom-left order. */
export function resolveRectCornerRadii(
  cornerRadii: RectCornerRadii | undefined,
  width: number,
  height: number,
): RectCornerRadii {
  const [topLeft, topRight, bottomRight, bottomLeft] = cornerRadii ?? [
    0, 0, 0, 0,
  ]
  const resolved: RectCornerRadii = [
    validRadius(topLeft),
    validRadius(topRight),
    validRadius(bottomRight),
    validRadius(bottomLeft),
  ]
  const availableWidth = finiteSize(width)
  const availableHeight = finiteSize(height)
  const scale = Math.min(
    1,
    edgeScale(availableWidth, resolved[0] + resolved[1]),
    edgeScale(availableWidth, resolved[3] + resolved[2]),
    edgeScale(availableHeight, resolved[0] + resolved[3]),
    edgeScale(availableHeight, resolved[1] + resolved[2]),
  )

  return scale === 1
    ? resolved
    : [
        resolved[0] * scale,
        resolved[1] * scale,
        resolved[2] * scale,
        resolved[3] * scale,
      ]
}

/** Serialize a stable SVG path for a rectangle with physical corner radii. */
export function rectCornerRadiiPath(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadii: RectCornerRadii,
): string {
  const bounds = rectBounds(x, y, width, height)
  const [topLeft, topRight, bottomRight, bottomLeft] = resolveRectCornerRadii(
    cornerRadii,
    bounds.width,
    bounds.height,
  )
  const left = bounds.x
  const top = bounds.y
  const right = left + bounds.width
  const bottom = top + bounds.height

  return [
    `M${pathNumber(left + topLeft)},${pathNumber(top)}`,
    `H${pathNumber(right - topRight)}`,
    `A${pathNumber(topRight)},${pathNumber(topRight)} 0 0 1 ${pathNumber(right)},${pathNumber(top + topRight)}`,
    `V${pathNumber(bottom - bottomRight)}`,
    `A${pathNumber(bottomRight)},${pathNumber(bottomRight)} 0 0 1 ${pathNumber(right - bottomRight)},${pathNumber(bottom)}`,
    `H${pathNumber(left + bottomLeft)}`,
    `A${pathNumber(bottomLeft)},${pathNumber(bottomLeft)} 0 0 1 ${pathNumber(left)},${pathNumber(bottom - bottomLeft)}`,
    `V${pathNumber(top + topLeft)}`,
    `A${pathNumber(topLeft)},${pathNumber(topLeft)} 0 0 1 ${pathNumber(left + topLeft)},${pathNumber(top)}`,
    'Z',
  ].join('')
}

function validRadius(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function finiteSize(value: number): number {
  return Number.isFinite(value) ? Math.abs(value) : 0
}

function edgeScale(available: number, requested: number): number {
  return requested === 0 ? 1 : available / requested
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

function pathNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}
