import type { CurveFactory } from 'd3-shape'
import { scenePath } from './scene-path'
import type { ScenePathContext, ScenePathGeometry } from './types'

export function recordD3LinePath(
  curve: CurveFactory,
  points: readonly (readonly [number, number])[],
): ScenePathGeometry {
  return scenePath((path) => {
    const output = curve(d3PathContext(path))
    output.lineStart()
    for (const point of points) output.point(point[0], point[1])
    output.lineEnd()
  })
}

export function recordD3AreaPath(
  curve: CurveFactory,
  top: readonly (readonly [number, number])[],
  bottom: readonly (readonly [number, number])[],
): ScenePathGeometry {
  return scenePath((path) => {
    const output = curve(d3PathContext(path))
    output.areaStart()
    output.lineStart()
    for (const point of top) output.point(point[0], point[1])
    output.lineEnd()
    output.lineStart()
    for (let index = bottom.length; index--;) {
      const point = bottom[index]!
      output.point(point[0], point[1])
    }
    output.lineEnd()
    output.areaEnd()
  })
}

function d3PathContext(path: ScenePathContext): CanvasRenderingContext2D {
  // D3 types name the complete Canvas context even though curve factories use
  // only these four path methods. Keep that over-broad boundary isolated here.
  return path as unknown as CanvasRenderingContext2D
}
