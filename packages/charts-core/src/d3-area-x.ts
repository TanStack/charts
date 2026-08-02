import type { CurveFactory } from 'd3-shape'
import type { AreaXCurve } from './area-x'
import { recordD3AreaPath } from './d3-curve-path'

/** Adapts a built-in Cartesian d3-shape curve factory to horizontal areas. */
export function d3AreaXCurve(curve: CurveFactory): AreaXCurve {
  const areaX = (
    right: readonly (readonly [number, number])[],
    left: readonly (readonly [number, number])[],
  ) => recordD3AreaPath(curve, right, left)

  return {
    areaX: (right, left) => areaX(right, left).data,
    geometry: { areaX },
  }
}
