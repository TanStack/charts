import type { CurveFactory } from 'd3-shape'
import { recordD3AreaPath, recordD3LinePath } from './d3-curve-path'
import type { ChartCurve } from './types'

export function d3Curve(curve: CurveFactory): ChartCurve {
  const geometry = {
    line: (points: readonly (readonly [number, number])[]) =>
      recordD3LinePath(curve, points),
    area: (
      top: readonly (readonly [number, number])[],
      bottom: readonly (readonly [number, number])[],
    ) => recordD3AreaPath(curve, top, bottom),
  }

  return {
    line: (points) => geometry.line(points).data,
    area: (top, bottom) => geometry.area(top, bottom).data,
    geometry,
  }
}
