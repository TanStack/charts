import {
  area as createAreaPath,
  line as createLinePath,
  type CurveFactory,
} from 'd3-shape'
import type { ChartCurve } from './types'

export function d3Curve(curve: CurveFactory): ChartCurve {
  const linePath = createLinePath<readonly [number, number]>()
    .x((point) => point[0])
    .y((point) => point[1])
    .curve(curve)
  const areaPath = createAreaPath<
    readonly [x: number, y1: number, y2: number]
  >()
    .x((point) => point[0])
    .y0((point) => point[1])
    .y1((point) => point[2])
    .curve(curve)
  return {
    line: (points) => linePath(points) ?? '',
    area: (top, bottom) =>
      areaPath(
        top.map(
          (point, index) =>
            [point[0], bottom[index]?.[1] ?? point[1], point[1]] as const,
        ),
      ) ?? '',
  }
}
