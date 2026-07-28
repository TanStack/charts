import { area as createAreaPath, type CurveFactory } from 'd3-shape'
import type { AreaXCurve } from './area-x'

export function d3AreaXCurve(curve: CurveFactory): AreaXCurve {
  const areaPath = createAreaPath<
    readonly [y: number, x1: number, x2: number]
  >()
    .x0((point) => point[1])
    .x1((point) => point[2])
    .y((point) => point[0])
    .curve(curve)

  return {
    areaX: (right, left) =>
      areaPath(
        right.map(
          (point, index) =>
            [point[1], left[index]?.[0] ?? point[0], point[0]] as const,
        ),
      ) ?? '',
  }
}
