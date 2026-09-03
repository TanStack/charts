import { createMark } from './mark'
import { initializeCompositeMark } from './mark-composite-internal'
import type {
  ChartMark,
  ChartMarkDatum,
  ChartMarkMotionOptions,
  ChartMarkPointX,
  ChartMarkPointY,
} from './types'

type AnyChartMark = ChartMark<any, any, any, any, any, any, any>

type ChartMarkScaleIdX<TMark> =
  TMark extends ChartMark<any, any, any, any, any, infer TScaleId, any>
    ? TScaleId
    : never

type ChartMarkAnyScaleX<TMark> =
  TMark extends ChartMark<any, any, any, infer TValue, any, any, any>
    ? TValue
    : never

type ChartMarkAnyScaleY<TMark> =
  TMark extends ChartMark<any, any, any, any, infer TValue, any, any>
    ? TValue
    : never

type ChartMarkScaleIdY<TMark> =
  TMark extends ChartMark<any, any, any, any, any, any, infer TScaleId>
    ? TScaleId
    : never

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
  ChartMarkAnyScaleX<TMarks[number]>,
  ChartMarkAnyScaleY<TMarks[number]>,
  ChartMarkScaleIdX<TMarks[number]>,
  ChartMarkScaleIdY<TMarks[number]>
>
export function compositeMark(
  marks: readonly AnyChartMark[],
  options: CompositeMarkOptions = {},
): ChartMark<any, any, any, any, any, any, any> {
  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `composite-${markIndex}`
      return initializeCompositeMark(id, marks, { motion: options.motion })
    },
    options.motion,
    options.renderer,
  )
}
