import { createMark } from './mark'
import { initializeCompositeMark } from './mark-composite-internal'
import type {
  ChartMark,
  ChartMarkDatum,
  ChartMarkMotionOptions,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkScaleX,
  ChartMarkScaleY,
} from './types'

type AnyChartMark = ChartMark<any, any, any, any, any>

export interface CompositeMarkOptions<
  TDatum = unknown,
> extends ChartMarkMotionOptions<TDatum> {
  id?: string
}

/** Combines ordinary child marks into one namespaced chart mark. */
export function compositeMark<const TMarks extends readonly AnyChartMark[]>(
  marks: TMarks,
  options?: CompositeMarkOptions<ChartMarkDatum<TMarks[number]>>,
): ChartMark<
  ChartMarkDatum<TMarks[number]>,
  ChartMarkPointX<TMarks[number]>,
  ChartMarkPointY<TMarks[number]>,
  ChartMarkScaleX<TMarks[number]>,
  ChartMarkScaleY<TMarks[number]>
>
export function compositeMark(
  marks: readonly AnyChartMark[],
  options: CompositeMarkOptions = {},
): ChartMark<any, any, any, any, any> {
  return createMark(({ markIndex }) => {
    const id = options.id ?? `composite-${markIndex}`
    return initializeCompositeMark(id, marks, { motion: options.motion })
  })
}
