import type {
  TransformGroupRow,
  TransformGroupSpec,
  TransformLineage,
  TransformOrderOptions,
  TransformValue,
} from './transform'
import {
  materializeGroups,
  orderedIndexes,
  toArray,
  transformValues,
} from './transform-internal'

export type WaterfallKind = 'increase' | 'decrease' | 'total'

export interface WaterfallOptions<
  TDatum,
> extends TransformOrderOptions<TDatum> {
  value: TransformValue<TDatum, number | null | undefined>
  by?: TransformGroupSpec<TDatum>
  /** Appends a zero-based net-total row to each nonempty group. */
  total?: boolean
}

type WaterfallDerivedField =
  keyof TransformLineage<unknown> | 'delta' | 'start' | 'end' | 'kind'

export type WaterfallStepDatum<TDatum extends object> = Omit<
  TDatum,
  WaterfallDerivedField
> &
  TransformLineage<TDatum> & {
    readonly delta: number
    readonly start: number
    readonly end: number
    readonly kind: 'increase' | 'decrease'
  }

export type WaterfallTotalDatum<
  TDatum extends object,
  TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
> = TransformGroupRow<TDatum, TBy> &
  TransformLineage<TDatum> & {
    readonly delta: number
    readonly start: 0
    readonly end: number
    readonly kind: 'total'
  }

export type WaterfallDatum<
  TDatum extends object,
  TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
> = WaterfallStepDatum<TDatum> | WaterfallTotalDatum<TDatum, TBy>

/** Materializes signed contributions as cumulative intervals. */
export function waterfall<TDatum extends object>(
  source: Iterable<TDatum>,
  options: Omit<WaterfallOptions<TDatum>, 'by'> & { by?: undefined },
): WaterfallDatum<TDatum>[]
export function waterfall<
  TDatum extends object,
  const TBy extends TransformGroupSpec<TDatum>,
>(
  source: Iterable<TDatum>,
  options: Omit<WaterfallOptions<TDatum>, 'by'> & { by: TBy },
): WaterfallDatum<TDatum, TBy>[]
export function waterfall<TDatum extends object>(
  source: Iterable<TDatum>,
  options: WaterfallOptions<TDatum>,
): WaterfallDatum<TDatum, TransformGroupSpec<TDatum> | undefined>[]
export function waterfall<TDatum extends object>(
  source: Iterable<TDatum>,
  options: WaterfallOptions<TDatum>,
): (WaterfallStepDatum<TDatum> | WaterfallRuntimeTotalDatum<TDatum>)[] {
  if (options.total === true) assertTotalGroupNames(options.by)
  const data = toArray(source)
  const values = transformValues(data, options.value)

  return materializeGroups(data, options.by).flatMap(({ group, indexes }) => {
    const validIndexes = indexes.filter((index) =>
      isFiniteNumber(values[index]),
    )
    const ordered = orderedIndexes(
      data,
      validIndexes,
      options.orderBy,
      options.order,
    )
    let cursor = 0
    const steps = ordered.map((index) => {
      const datum = data[index] as TDatum
      const delta = values[index] as number
      const start = cursor
      const end = start + delta
      if (!Number.isFinite(end)) {
        throw new TypeError(
          `waterfall: cumulative value at index ${index} must be finite`,
        )
      }
      cursor = end
      return {
        ...datum,
        delta,
        start,
        end,
        kind: delta >= 0 ? 'increase' : 'decrease',
        source: [datum],
        sourceIndexes: [index],
      } as WaterfallStepDatum<TDatum>
    })

    if (options.total !== true || ordered.length === 0) return steps

    const total = Object.assign({}, group, {
      delta: cursor,
      start: 0 as const,
      end: cursor,
      kind: 'total' as const,
      source: ordered.map((index) => data[index] as TDatum),
      sourceIndexes: ordered,
    })
    return [...steps, total]
  })
}

type WaterfallRuntimeTotalDatum<TDatum extends object> =
  TransformLineage<TDatum> & {
    readonly delta: number
    readonly start: 0
    readonly end: number
    readonly kind: 'total'
  }

const waterfallDerivedFields = new Set([
  'delta',
  'start',
  'end',
  'kind',
  'source',
  'sourceIndexes',
])

function assertTotalGroupNames<TDatum>(
  by: TransformGroupSpec<TDatum> | undefined,
): void {
  if (by === undefined) return
  const names = typeof by === 'string' ? [by] : Object.keys(by)
  for (const name of names) {
    if (waterfallDerivedFields.has(name)) {
      throw new TypeError(
        `waterfall: group name "${name}" is reserved when total is true`,
      )
    }
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
