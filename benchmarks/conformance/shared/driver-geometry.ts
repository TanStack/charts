import type {
  ConformanceGeometrySample,
  ConformanceResolvedTarget,
} from '../types'

export interface ClientPointBoundsOptions {
  paint: string
  scaleX?: number
  scaleY?: number
}

/**
 * Bounds local chart points in viewport-relative client coordinates.
 * Degenerate point clouds retain a one-pixel geometry sample for comparison.
 */
export function clientPointBounds(
  points: readonly (readonly [number, number])[],
  origin: Pick<DOMRectReadOnly, 'left' | 'top'>,
  options: ClientPointBoundsOptions,
): ConformanceGeometrySample | null {
  if (!points.length) return null

  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const [x, y] of points) {
    left = Math.min(left, x)
    right = Math.max(right, x)
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  }

  const scaleX = options.scaleX ?? 1
  const scaleY = options.scaleY ?? 1
  return {
    x: origin.left + left * scaleX,
    y: origin.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint: options.paint,
  }
}

/** Maps one outer-scene coordinate through the mounted SVG viewport. */
export function scenePointToClient(
  surface: ParentNode,
  scene: { readonly width: number; readonly height: number },
  x: number,
  y: number,
): ConformanceResolvedTarget | null {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (
    !svg ||
    !Number.isFinite(scene.width) ||
    !Number.isFinite(scene.height) ||
    scene.width <= 0 ||
    scene.height <= 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null
  }
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: svg,
  }
}
