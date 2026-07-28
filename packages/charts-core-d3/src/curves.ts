import {
  curveMonotoneX as d3CurveMonotoneX,
  curveStep as d3CurveStep,
  curveStepAfter as d3CurveStepAfter,
  curveStepBefore as d3CurveStepBefore,
  line,
  type CurveFactory,
} from 'd3-shape'
import type { ChartCurve } from './types'

export const curveStep = createCurve('step', d3CurveStep)
export const curveStepBefore = createCurve('step-before', d3CurveStepBefore)
export const curveStepAfter = createCurve('step-after', d3CurveStepAfter)
export const curveMonotoneX = createCurve('monotone-x', d3CurveMonotoneX)

function createCurve(id: string, curve: CurveFactory): ChartCurve {
  const path = line<readonly [number, number]>()
    .x((point) => point[0])
    .y((point) => point[1])
    .curve(curve)

  return {
    id,
    path: (points) => path(points) ?? '',
  }
}
