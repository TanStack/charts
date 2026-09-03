import type {
  TransformLineage,
  TransformOrderOptions,
  TransformValue,
} from './transform'
import { orderedIndexes, toArray, transformValues } from './transform-internal'
import { allocateProportionalIntervals } from './proportional-interval-internal'

const tau = Math.PI * 2
const fullRevolutionTolerance = 1e-12

export interface PieOptions<TDatum> extends TransformOrderOptions<TDatum> {
  readonly value: TransformValue<TDatum, number | null | undefined>
  /** Overall start angle in radians. Defaults to 0 at 12 o'clock. */
  readonly startAngle?: number
  /** Overall end angle in radians. Defaults to 2π. */
  readonly endAngle?: number
  /** Radius-independent empty angle between visible slices. Defaults to 0. */
  readonly gapAngle?: number
}

type PieDerivedField =
  | keyof TransformLineage<unknown>
  | 'value'
  | 'index'
  | 'fraction'
  | 'startAngle'
  | 'endAngle'
  | 'angle'
  | 'padAngle'

export type PieDatum<TDatum extends object> = Omit<TDatum, PieDerivedField> &
  TransformLineage<TDatum> & {
    readonly value: number
    /** Zero-based position in angular order. */
    readonly index: number
    /** Fraction of the positive value total, or zero when the total is zero. */
    readonly fraction: number
    /** Start of the visible slice in radians. */
    readonly startAngle: number
    /** End of the visible slice in radians. */
    readonly endAngle: number
    /** Midpoint of the visible slice in radians. */
    readonly angle: number
    /** Gaps are materialized in the interval, so radialArc must not pad again. */
    readonly padAngle: 0
  }

interface PieInterval {
  readonly value: number
  readonly index: number
  readonly fraction: number
  readonly startAngle: number
  readonly endAngle: number
  readonly angle: number
  readonly padAngle: 0
}

/** Allocates nonnegative values into source-linked polar angle intervals. */
export function pie<TDatum extends object>(
  source: Iterable<TDatum>,
  options: PieOptions<NoInfer<TDatum>>,
): PieDatum<TDatum>[] {
  const data = toArray(source)
  const values = transformValues(data, options.value)
  const startAngle = options.startAngle ?? 0
  const endAngle = options.endAngle ?? tau
  const gapAngle = options.gapAngle ?? 0

  assertFinite(startAngle, 'startAngle')
  assertFinite(endAngle, 'endAngle')
  assertNonnegativeFinite(gapAngle, 'gapAngle')

  const sweep = endAngle - startAngle
  if (!Number.isFinite(sweep) || Math.abs(sweep) > tau) {
    throw new TypeError('pie: angular sweep must be no greater than 2π')
  }

  const sourceIndexes = values.flatMap((value, sourceIndex) => {
    if (!isFiniteNumber(value)) return []
    if (value < 0) {
      throw new TypeError(
        `pie: value at index ${sourceIndex} must be nonnegative`,
      )
    }
    return [sourceIndex]
  })
  const ordered = orderedIndexes(
    data,
    sourceIndexes,
    options.orderBy,
    options.order,
  )
  const completeRevolution =
    Math.abs(Math.abs(sweep) - tau) <= fullRevolutionTolerance
  assertPieGapCapacity(ordered, values, sweep, gapAngle, completeRevolution)
  const allocated = allocateProportionalIntervals(
    ordered.map((sourceIndex) => values[sourceIndex] as number),
    {
      start: startAngle,
      end: endAngle,
      gap: gapAngle,
      gapAfterLast: completeRevolution,
    },
  )
  const intervals = new Map<number, PieInterval>()
  ordered.forEach((sourceIndex, index) => {
    const interval = allocated[index]!
    const value = values[sourceIndex] as number
    intervals.set(sourceIndex, {
      value,
      index,
      fraction: interval.fraction,
      startAngle: interval.start,
      endAngle: interval.end,
      angle: interval.start + (interval.end - interval.start) / 2,
      padAngle: 0,
    })
  })

  return sourceIndexes.map((sourceIndex) => {
    const datum = data[sourceIndex] as TDatum
    return {
      ...datum,
      ...(intervals.get(sourceIndex) as PieInterval),
      source: [datum],
      sourceIndexes: [sourceIndex],
    } as PieDatum<TDatum>
  })
}

function assertPieGapCapacity(
  ordered: readonly number[],
  values: readonly unknown[],
  sweep: number,
  gapAngle: number,
  completeRevolution: boolean,
): void {
  const positiveCount = ordered.reduce(
    (count, sourceIndex) =>
      count + ((values[sourceIndex] as number) > 0 ? 1 : 0),
    0,
  )
  const absoluteSweep = Math.abs(sweep)
  const gapCount =
    positiveCount === 0
      ? 0
      : completeRevolution
        ? positiveCount
        : Math.max(0, positiveCount - 1)
  const totalGap = gapCount * gapAngle

  if (!Number.isFinite(totalGap) || totalGap > absoluteSweep) {
    throw new TypeError('pie: gapAngle leaves insufficient angular space')
  }

  const drawableSweep = absoluteSweep - totalGap
  if (positiveCount > 0 && drawableSweep <= 0) {
    throw new TypeError('pie: positive values require drawable angular space')
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`pie: ${name} must be finite`)
  }
}

function assertNonnegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`pie: ${name} must be nonnegative and finite`)
  }
}
