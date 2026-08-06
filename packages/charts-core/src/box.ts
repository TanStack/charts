import { barX, barY } from './bar'
import { dot } from './dot'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartValue,
} from './mark'
import { initializeCompositeMark } from './mark-composite-internal'
import { link } from './link'
import { valueKey } from './scales'
import { tickX, tickY } from './tick'
import { groupedIndexes } from './transform-internal'
import { quantileSortedValues } from './transform-statistics-internal'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartMotionDefinition,
  ChartMarkMotionOptions,
  ChartValue,
  OptionChannelOutput,
} from './types'

export interface BoxSummaryDatum<
  TDatum,
  TCategory extends ChartValue = ChartValue,
> {
  readonly kind: 'summary'
  readonly category: TCategory
  readonly q1: number
  readonly median: number
  readonly q3: number
  readonly whiskerLow: number
  readonly whiskerHigh: number
  readonly count: number
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export interface BoxOutlierDatum<
  TDatum,
  TCategory extends ChartValue = ChartValue,
> {
  readonly kind: 'outlier'
  readonly category: TCategory
  readonly value: number
  readonly source: readonly [TDatum]
  readonly sourceIndexes: readonly [number]
}

export type BoxDatum<TDatum, TCategory extends ChartValue = ChartValue> =
  BoxSummaryDatum<TDatum, TCategory> | BoxOutlierDatum<TDatum, TCategory>

interface BoxOptions<
  TDatum,
  TCategory extends ChartValue = ChartValue,
> extends ChartMarkMotionOptions<BoxDatum<TDatum, TCategory>> {
  id?: string
  key?: Channel<TDatum, ChartKey>
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  /** Applied to the whisker, median, and outlier marks. */
  strokeWidth?: number
  /** Pixels removed from both categorical edges of the box and median. */
  inset?: number
  /** Outlier radius in pixels. Defaults to 3. */
  r?: number
}

export interface BoxYOptions<
  TDatum,
  TCategory extends ChartValue = ChartValue,
> extends BoxOptions<TDatum, TCategory> {
  x: Channel<TDatum, TCategory | null | undefined>
  y: Channel<TDatum, number | null | undefined>
}

export interface BoxXOptions<
  TDatum,
  TCategory extends ChartValue = ChartValue,
> extends BoxOptions<TDatum, TCategory> {
  x: Channel<TDatum, number | null | undefined>
  y: Channel<TDatum, TCategory | null | undefined>
}

export type BoxYDatum<TDatum, TOptions> = BoxDatum<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>
>

export type BoxXDatum<TDatum, TOptions> = BoxDatum<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
>

type BoxYCallOptions<
  TDatum,
  TXChannel extends Channel<NoInfer<TDatum>, ChartValue | null | undefined>,
> = Omit<BoxYOptions<NoInfer<TDatum>>, 'motion' | 'x'> & {
  x: TXChannel
  motion?: ChartMotionDefinition<BoxYDatum<TDatum, { x: TXChannel }>>
}

type BoxXCallOptions<
  TDatum,
  TYChannel extends Channel<NoInfer<TDatum>, ChartValue | null | undefined>,
> = Omit<BoxXOptions<NoInfer<TDatum>>, 'motion' | 'y'> & {
  y: TYChannel
  motion?: ChartMotionDefinition<BoxXDatum<TDatum, { y: TYChannel }>>
}

/** Summarizes raw observations into vertical Tukey boxplots. */
export function boxY<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: BoxYCallOptions<TDatum, TXChannel>,
): ChartMark<
  BoxYDatum<TDatum, { x: TXChannel }>,
  OptionChannelOutput<TDatum, { x: TXChannel }, 'x', number>,
  number
>
export function boxY<TDatum>(
  source: Iterable<TDatum>,
  options: BoxYOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return box(source, options, options.x, options.y, 'y')
}

/** Summarizes raw observations into horizontal Tukey boxplots. */
export function boxX<
  TDatum,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: BoxXCallOptions<TDatum, TYChannel>,
): ChartMark<
  BoxXDatum<TDatum, { y: TYChannel }>,
  number,
  OptionChannelOutput<TDatum, { y: TYChannel }, 'y', number>
>
export function boxX<TDatum>(
  source: Iterable<TDatum>,
  options: BoxXOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return box(source, options, options.y, options.x, 'x')
}

interface BoxMarkIdentity {
  readonly markKey: ChartKey
}

type BoxSummaryMarkDatum<TDatum> = BoxSummaryDatum<TDatum> & BoxMarkIdentity
type BoxOutlierMarkDatum<TDatum> = BoxOutlierDatum<TDatum> & BoxMarkIdentity

const interactiveBoxChildren = new Set(['box', 'outlier'])

function box<TDatum>(
  source: Iterable<TDatum>,
  options: BoxOptions<NoInfer<TDatum>>,
  category: Channel<TDatum, ChartValue | null | undefined>,
  numeric: Channel<TDatum, number | null | undefined>,
  orientation: 'x' | 'y',
): ChartMark<any, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `box-${orientation}-${markIndex}`
    const categoryValues = channelValues(data, category, () => undefined)
    const numericValues = channelValues(data, numeric, () => undefined)
    const keys = inferredKeyValues(data, options.key, {
      groups: categoryValues,
      markId: id,
      warningIdentity: options,
    })
    const { summaries, outliers } = summarizeBoxes(
      data,
      categoryValues,
      numericValues,
      keys,
    )
    const stroke = options.stroke ?? 'currentColor'
    const children =
      orientation === 'y'
        ? [
            link(summaries, {
              id: 'whisker',
              x1: 'category',
              y1: 'whiskerLow',
              x2: 'category',
              y2: 'whiskerHigh',
              key: 'markKey',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1,
              lineCap: 'butt',
            }),
            barY(summaries, {
              id: 'box',
              x: 'category',
              y: 'median',
              y1: 'q1',
              y2: 'q3',
              key: 'markKey',
              fill: options.fill ?? '#ccc',
              fillOpacity: options.fillOpacity,
              inset: options.inset,
            }),
            tickY(summaries, {
              id: 'median',
              x: 'category',
              y: 'median',
              key: 'markKey',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 2,
              inset: options.inset,
            }),
            dot(outliers, {
              id: 'outlier',
              x: 'category',
              y: 'value',
              key: 'markKey',
              r: options.r ?? 3,
              fill: 'none',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1.5,
            }),
          ]
        : [
            link(summaries, {
              id: 'whisker',
              x1: 'whiskerLow',
              y1: 'category',
              x2: 'whiskerHigh',
              y2: 'category',
              key: 'markKey',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1,
              lineCap: 'butt',
            }),
            barX(summaries, {
              id: 'box',
              x: 'median',
              x1: 'q1',
              x2: 'q3',
              y: 'category',
              key: 'markKey',
              fill: options.fill ?? '#ccc',
              fillOpacity: options.fillOpacity,
              inset: options.inset,
            }),
            tickX(summaries, {
              id: 'median',
              x: 'median',
              y: 'category',
              key: 'markKey',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 2,
              inset: options.inset,
            }),
            dot(outliers, {
              id: 'outlier',
              x: 'value',
              y: 'category',
              key: 'markKey',
              r: options.r ?? 3,
              fill: 'none',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1.5,
            }),
          ]

    return initializeCompositeMark(id, children, {
      motion: options.motion,
      interactiveChildren: interactiveBoxChildren,
    })
  })
}

function summarizeBoxes<TDatum>(
  data: readonly TDatum[],
  categoryValues: readonly (ChartValue | null | undefined)[],
  numericValues: readonly (number | null | undefined)[],
  keys: readonly ChartKey[],
): {
  summaries: BoxSummaryMarkDatum<TDatum>[]
  outliers: BoxOutlierMarkDatum<TDatum>[]
} {
  const summaries: BoxSummaryMarkDatum<TDatum>[] = []
  const outliers: BoxOutlierMarkDatum<TDatum>[] = []

  for (const { key: category, indexes } of groupedIndexes(categoryValues)) {
    if (!isChartValue(category)) continue
    const observations = indexes.flatMap((sourceIndex) => {
      const value = numericValues[sourceIndex]
      return typeof value === 'number' && Number.isFinite(value)
        ? [{ sourceIndex, value }]
        : []
    })
    if (!observations.length) continue
    const sourceIndexes = observations.map(({ sourceIndex }) => sourceIndex)
    const ranked = [...observations].sort(
      (left, right) =>
        left.value - right.value || left.sourceIndex - right.sourceIndex,
    )
    const values = ranked.map(({ value }) => value)
    const q1 = quantileSortedValues(values, 0.25)
    const median = quantileSortedValues(values, 0.5)
    const q3 = quantileSortedValues(values, 0.75)
    const spread = q3 - q1
    const lowerFence = q1 - spread * 1.5
    const upperFence = q3 + spread * 1.5
    const whiskerLow =
      ranked.find(({ value }) => value >= lowerFence)?.value ?? q1
    let whiskerHigh = q3
    for (let index = ranked.length - 1; index >= 0; index -= 1) {
      const candidate = ranked[index]
      if (!candidate || candidate.value > upperFence) continue
      whiskerHigh = candidate.value
      break
    }
    const groupKey = `box:${valueKey(category)}`
    summaries.push({
      kind: 'summary',
      category,
      q1,
      median,
      q3,
      whiskerLow,
      whiskerHigh,
      count: sourceIndexes.length,
      source: sourceIndexes.map((index) => data[index] as TDatum),
      sourceIndexes,
      markKey: groupKey,
    })

    for (const { sourceIndex, value } of observations) {
      if (value >= lowerFence && value <= upperFence) continue
      outliers.push({
        kind: 'outlier',
        category,
        value,
        source: [data[sourceIndex] as TDatum],
        sourceIndexes: [sourceIndex],
        markKey: `${groupKey}:outlier:${valueKey(keys[sourceIndex])}`,
      })
    }
  }

  outliers.sort((left, right) => left.sourceIndexes[0] - right.sourceIndexes[0])
  return { summaries, outliers }
}
