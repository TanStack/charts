import { allocateProportionalIntervals } from './proportional-interval-internal'
import type {
  TransformLineage,
  TransformValue,
  TransformValueOutput,
} from './transform'
import { toArray, transformKey, transformValues } from './transform-internal'
import type { ChartValue } from './types'

export interface MosaicOptions<
  TDatum,
  TX extends TransformValue<TDatum, ChartValue> = TransformValue<
    TDatum,
    ChartValue
  >,
  TY extends TransformValue<TDatum, ChartValue> = TransformValue<
    TDatum,
    ChartValue
  >,
  TValue extends TransformValue<TDatum, number | null | undefined> =
    TransformValue<TDatum, number | null | undefined>,
> {
  /** Categorical horizontal channel. */
  readonly x: TX
  /** Categorical vertical channel. */
  readonly y: TY
  /** Nonnegative aggregate represented by this x/y pair. */
  readonly value: TValue
  /** Horizontal category order. Unobserved categories do not create rows. */
  readonly xOrder?: readonly ChartValue[]
  /** Vertical category order. Unobserved categories do not create rows. */
  readonly yOrder?: readonly ChartValue[]
}

type MosaicDerivedField =
  | keyof TransformLineage<unknown>
  | 'xValue'
  | 'yValue'
  | 'value'
  | 'total'
  | 'x'
  | 'x1'
  | 'x2'
  | 'y'
  | 'y1'
  | 'y2'

type MosaicDatumBase<
  TDatum extends object,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
  TOuterTotal extends 'xTotal' | 'yTotal',
> = Omit<TDatum, MosaicDerivedField | TOuterTotal> &
  TransformLineage<TDatum> & {
    readonly xValue: TXValue
    readonly yValue: TYValue
    readonly value: number
    readonly total: number
    readonly x: number
    readonly x1: number
    readonly x2: number
    readonly y: number
    readonly y1: number
    readonly y2: number
  }

export type MosaicYDatum<
  TDatum extends object,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = MosaicDatumBase<TDatum, TXValue, TYValue, 'xTotal'> & {
  /** Sum of values in this cell's horizontal category. */
  readonly xTotal: number
}

export type MosaicXDatum<
  TDatum extends object,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = MosaicDatumBase<TDatum, TXValue, TYValue, 'yTotal'> & {
  /** Sum of values in this cell's vertical category. */
  readonly yTotal: number
}

interface PreparedMosaicRow<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  readonly datum: TDatum
  readonly sourceIndex: number
  readonly xValue: TXValue
  readonly yValue: TYValue
  readonly xIdentity: string
  readonly yIdentity: string
  readonly value: number
}

interface OrderedCategory<TValue extends ChartValue> {
  readonly identity: string
  readonly value: TValue
}

interface MosaicCoordinates {
  readonly x: number
  readonly x1: number
  readonly x2: number
  readonly y: number
  readonly y1: number
  readonly y2: number
  readonly outerTotal: number
}

type MosaicOrientation = 'x' | 'y'

/**
 * Allocates horizontal category totals into widths, then normalizes vertical
 * categories independently within each horizontal category.
 */
export function mosaicY<
  TDatum extends object,
  const TX extends TransformValue<TDatum, ChartValue>,
  const TY extends TransformValue<TDatum, ChartValue>,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: MosaicOptions<TDatum, TX, TY, TValue>,
): MosaicYDatum<
  TDatum,
  Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
  Extract<TransformValueOutput<TDatum, TY>, ChartValue>
>[] {
  return materializeMosaic(source, options, 'y') as MosaicYDatum<
    TDatum,
    Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
    Extract<TransformValueOutput<TDatum, TY>, ChartValue>
  >[]
}

/**
 * Allocates vertical category totals into heights, then normalizes horizontal
 * categories independently within each vertical category.
 */
export function mosaicX<
  TDatum extends object,
  const TX extends TransformValue<TDatum, ChartValue>,
  const TY extends TransformValue<TDatum, ChartValue>,
  const TValue extends TransformValue<TDatum, number | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: MosaicOptions<TDatum, TX, TY, TValue>,
): MosaicXDatum<
  TDatum,
  Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
  Extract<TransformValueOutput<TDatum, TY>, ChartValue>
>[] {
  return materializeMosaic(source, options, 'x') as MosaicXDatum<
    TDatum,
    Extract<TransformValueOutput<TDatum, TX>, ChartValue>,
    Extract<TransformValueOutput<TDatum, TY>, ChartValue>
  >[]
}

function materializeMosaic<
  TDatum extends object,
  TX extends TransformValue<TDatum, ChartValue>,
  TY extends TransformValue<TDatum, ChartValue>,
  TValue extends TransformValue<TDatum, number | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: MosaicOptions<TDatum, TX, TY, TValue>,
  orientation: MosaicOrientation,
): object[] {
  const owner = orientation === 'y' ? 'mosaicY' : 'mosaicX'
  const data = toArray(source)
  const xValues = transformValues(data, options.x)
  const yValues = transformValues(data, options.y)
  const values = transformValues(data, options.value)
  const rows = prepareRows(data, xValues, yValues, values, owner)
  const xCategories = orderedCategories(
    rows,
    (row) => row.xValue,
    options.xOrder,
    owner,
    'xOrder',
  )
  const yCategories = orderedCategories(
    rows,
    (row) => row.yValue,
    options.yOrder,
    owner,
    'yOrder',
  )
  const { coordinates, total } = allocateMosaic(
    rows,
    xCategories,
    yCategories,
    orientation,
  )

  return rows.map((row) => {
    const position = coordinates.get(row.sourceIndex) as MosaicCoordinates
    const derived = {
      xValue: row.xValue,
      yValue: row.yValue,
      value: row.value,
      total,
      x: position.x,
      x1: position.x1,
      x2: position.x2,
      y: position.y,
      y1: position.y1,
      y2: position.y2,
      source: [row.datum],
      sourceIndexes: [row.sourceIndex],
    }
    return orientation === 'y'
      ? { ...row.datum, ...derived, xTotal: position.outerTotal }
      : { ...row.datum, ...derived, yTotal: position.outerTotal }
  })
}

function prepareRows<TDatum, TXValue, TYValue>(
  data: readonly TDatum[],
  xValues: readonly TXValue[],
  yValues: readonly TYValue[],
  values: readonly (number | null | undefined)[],
  owner: string,
): PreparedMosaicRow<
  TDatum,
  Extract<TXValue, ChartValue>,
  Extract<TYValue, ChartValue>
>[] {
  const rows: PreparedMosaicRow<
    TDatum,
    Extract<TXValue, ChartValue>,
    Extract<TYValue, ChartValue>
  >[] = []
  const pairs = new Map<string, number>()

  data.forEach((datum, sourceIndex) => {
    const value = values[sourceIndex]
    if (!isFiniteNumber(value)) return
    if (value < 0) {
      throw new TypeError(
        `${owner}: value at index ${sourceIndex} must be nonnegative`,
      )
    }
    const xValue = xValues[sourceIndex]
    const yValue = yValues[sourceIndex]
    if (!isChartValue(xValue) || !isChartValue(yValue)) return
    const xIdentity = transformKey(xValue)
    const yIdentity = transformKey(yValue)
    const pairIdentity = transformKey([xValue, yValue])
    const previous = pairs.get(pairIdentity)
    if (previous !== undefined) {
      throw new TypeError(
        `${owner}: duplicate x/y pair ${formatCategory(xValue)} / ${formatCategory(yValue)} at indexes ${previous} and ${sourceIndex}; aggregate duplicate pairs before calling ${owner}`,
      )
    }
    pairs.set(pairIdentity, sourceIndex)
    rows.push({
      datum,
      sourceIndex,
      xValue: xValue as Extract<TXValue, ChartValue>,
      yValue: yValue as Extract<TYValue, ChartValue>,
      xIdentity,
      yIdentity,
      value,
    })
  })

  return rows
}

function orderedCategories<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
  TValue extends ChartValue,
>(
  rows: readonly PreparedMosaicRow<TDatum, TXValue, TYValue>[],
  value: (row: PreparedMosaicRow<TDatum, TXValue, TYValue>) => TValue,
  explicit: readonly ChartValue[] | undefined,
  owner: string,
  option: 'xOrder' | 'yOrder',
): OrderedCategory<TValue>[] {
  const categories: OrderedCategory<TValue>[] = []
  const seen = new Set<string>()

  explicit?.forEach((category, index) => {
    if (!isChartValue(category)) {
      throw new TypeError(
        `${owner}: ${option} category at index ${index} must be a string, finite number, or valid Date`,
      )
    }
    const identity = transformKey(category)
    if (seen.has(identity)) {
      throw new TypeError(
        `${owner}: ${option} contains duplicate category ${formatCategory(category)}`,
      )
    }
    seen.add(identity)
    categories.push({ identity, value: category as TValue })
  })

  for (const row of rows) {
    const category = value(row)
    const identity = transformKey(category)
    if (seen.has(identity)) continue
    seen.add(identity)
    categories.push({ identity, value: category })
  }

  return categories
}

function allocateMosaic<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  rows: readonly PreparedMosaicRow<TDatum, TXValue, TYValue>[],
  xCategories: readonly OrderedCategory<TXValue>[],
  yCategories: readonly OrderedCategory<TYValue>[],
  orientation: MosaicOrientation,
): { coordinates: Map<number, MosaicCoordinates>; total: number } {
  const outerCategories = orientation === 'y' ? xCategories : yCategories
  const innerCategories = orientation === 'y' ? yCategories : xCategories
  const innerRank = new Map(
    innerCategories.map((category, index) => [category.identity, index]),
  )
  const outerIdentity = (row: PreparedMosaicRow<TDatum, TXValue, TYValue>) =>
    orientation === 'y' ? row.xIdentity : row.yIdentity
  const innerIdentity = (row: PreparedMosaicRow<TDatum, TXValue, TYValue>) =>
    orientation === 'y' ? row.yIdentity : row.xIdentity
  const rowsByOuter = new Map<
    string,
    Map<string, PreparedMosaicRow<TDatum, TXValue, TYValue>>
  >()

  for (const row of rows) {
    const outerKey = outerIdentity(row)
    let group = rowsByOuter.get(outerKey)
    if (!group) {
      group = new Map()
      rowsByOuter.set(outerKey, group)
    }
    group.set(innerIdentity(row), row)
  }

  const outerRows = outerCategories.map(
    (category) => rowsByOuter.get(category.identity) ?? new Map(),
  )
  const rawOuterTotals = outerRows.map((group) =>
    sumValues([...group.values()].map((row) => row.value)),
  )
  const outerWeights = overflowSafeGroupWeights(
    outerRows.map((group) => [...group.values()].map((row) => row.value)),
    rawOuterTotals,
  )
  const outerIntervals = allocateProportionalIntervals(outerWeights)
  const total = sumValues(rows.map((row) => row.value))
  const coordinates = new Map<number, MosaicCoordinates>()

  outerRows.forEach((group, outerIndex) => {
    const outer = outerIntervals[outerIndex]
    if (!outer) return
    const innerRows = [...group.values()].sort(
      (left, right) =>
        (innerRank.get(innerIdentity(left)) ?? Number.MAX_SAFE_INTEGER) -
        (innerRank.get(innerIdentity(right)) ?? Number.MAX_SAFE_INTEGER),
    )
    const innerIntervals = allocateProportionalIntervals(
      innerRows.map((row) => row.value),
    )

    innerRows.forEach((row, innerIndex) => {
      const inner = innerIntervals[innerIndex]
      if (!inner) return
      const outerCenter = midpoint(outer.start, outer.end)
      const innerCenter = midpoint(inner.start, inner.end)
      coordinates.set(
        row.sourceIndex,
        orientation === 'y'
          ? {
              x: outerCenter,
              x1: outer.start,
              x2: outer.end,
              y: innerCenter,
              y1: inner.start,
              y2: inner.end,
              outerTotal: rawOuterTotals[outerIndex] ?? 0,
            }
          : {
              x: innerCenter,
              x1: inner.start,
              x2: inner.end,
              y: outerCenter,
              y1: outer.start,
              y2: outer.end,
              outerTotal: rawOuterTotals[outerIndex] ?? 0,
            },
      )
    })
  })

  return { coordinates, total }
}

function overflowSafeGroupWeights(
  groups: readonly (readonly number[])[],
  rawTotals: readonly number[],
): number[] {
  if (rawTotals.every(Number.isFinite)) return [...rawTotals]
  let maximum = 0
  for (const group of groups) {
    for (const value of group) maximum = Math.max(maximum, value)
  }
  if (maximum === 0) return rawTotals.map(() => 0)
  return groups.map((group) =>
    group.reduce((sum, value) => sum + value / maximum, 0),
  )
}

function sumValues(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}

function midpoint(start: number, end: number): number {
  return start + (end - start) / 2
}

function isChartValue(value: unknown): value is ChartValue {
  return (
    typeof value === 'string' ||
    isFiniteNumber(value) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatCategory(value: ChartValue): string {
  return value instanceof Date
    ? value.toISOString()
    : (JSON.stringify(value) ?? String(value))
}
