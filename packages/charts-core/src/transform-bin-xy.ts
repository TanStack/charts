import { bin as d3Bin } from 'd3-array'
import type {
  TransformGroupRow,
  TransformGroupSpec,
  TransformLineage,
  TransformValue,
} from './transform'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import {
  materializeGroups,
  toArray,
  transformValues,
} from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
} from './transform-reduce-internal'

export interface BinXYOptions<TDatum> {
  x: TransformValue<TDatum, number | null | undefined>
  y: TransformValue<TDatum, number | null | undefined>
  by?: TransformGroupSpec<TDatum>
  xThresholds?: number | readonly number[]
  yThresholds?: number | readonly number[]
  xDomain?: readonly [number, number]
  yDomain?: readonly [number, number]
  outputs?: TransformOutputs<TDatum>
}

export type BinXYDatum<TDatum, TBy, TOutputs> = TransformGroupRow<TDatum, TBy> &
  TransformLineage<TDatum> &
  TransformOutputRow<TOutputs> & {
    readonly x: number
    readonly x1: number
    readonly x2: number
    readonly y: number
    readonly y1: number
    readonly y2: number
  }

type DefaultOutputs = { readonly value: { readonly reduce: 'count' } }

export function binXY<
  TDatum,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TOutputs extends TransformOutputs<TDatum> = DefaultOutputs,
>(
  source: Iterable<TDatum>,
  options: BinXYOptions<TDatum> & { by?: TBy; outputs?: TOutputs },
): BinXYDatum<TDatum, TBy, TOutputs>[] {
  const data = toArray(source)
  const xValues = transformValues(data, options.x)
  const yValues = transformValues(data, options.y)
  const valid = data.flatMap((datum, index) =>
    isFiniteNumber(xValues[index]) && isFiniteNumber(yValues[index])
      ? [
          {
            datum,
            index,
            x: xValues[index] as number,
            y: yValues[index] as number,
          },
        ]
      : [],
  )
  const rowByIndex = new Map(valid.map((row) => [row.index, row]))
  const xHistogram = histogram(
    options.xThresholds,
    options.xDomain,
    (row: (typeof valid)[number]) => row.x,
  )
  const yHistogram = histogram(
    options.yThresholds,
    options.yDomain,
    (row: (typeof valid)[number]) => row.y,
  )
  const xTemplate = xHistogram(valid)
  const yTemplate = yHistogram(valid)
  const outputs =
    options.outputs ?? ({ value: { reduce: 'count' } } as unknown as TOutputs)
  const groups = materializeGroups(data, options.by)
  assertTransformOutputNames(
    outputs,
    [
      ...Object.keys(groups[0]?.group ?? {}),
      'x',
      'x1',
      'x2',
      'y',
      'y1',
      'y2',
      'source',
      'sourceIndexes',
    ],
    'binXY',
  )
  const prepared = prepareOutputs(data, outputs)
  return groups.flatMap(({ group, indexes }) => {
    const groupRows = indexes.flatMap((index) => {
      const row = rowByIndex.get(index)
      return row ? [row] : []
    })
    const cellIndexes = new Map<string, number[]>()
    for (const row of groupRows) {
      const xPosition = intervalIndex(xTemplate, row.x)
      const yPosition = intervalIndex(yTemplate, row.y)
      if (xPosition < 0 || yPosition < 0) continue
      const identity = `${xPosition}:${yPosition}`
      const cell = cellIndexes.get(identity)
      if (cell) cell.push(row.index)
      else cellIndexes.set(identity, [row.index])
    }
    return xTemplate.flatMap((xEntry, xPosition) =>
      yTemplate.map((yEntry, yPosition) => {
        const sourceIndexes = cellIndexes.get(`${xPosition}:${yPosition}`) ?? []
        const x1 = xEntry.x0 as number
        const x2 = xEntry.x1 as number
        const y1 = yEntry.x0 as number
        const y2 = yEntry.x1 as number
        return {
          ...group,
          x: (x1 + x2) / 2,
          x1,
          x2,
          y: (y1 + y2) / 2,
          y1,
          y2,
          source: sourceIndexes.map((index) => data[index] as TDatum),
          sourceIndexes,
          ...reducePreparedOutputs<TDatum, TOutputs>(
            data,
            sourceIndexes,
            group,
            prepared,
          ),
        } as unknown as BinXYDatum<TDatum, TBy, TOutputs>
      }),
    )
  })
}

function intervalIndex(
  bins: readonly { x0?: number; x1?: number }[],
  value: number,
): number {
  return bins.findIndex(
    (entry, index) =>
      entry.x0 !== undefined &&
      entry.x1 !== undefined &&
      value >= entry.x0 &&
      (value < entry.x1 || (index === bins.length - 1 && value === entry.x1)),
  )
}

function histogram<TRow>(
  thresholds: number | readonly number[] | undefined,
  domain: readonly [number, number] | undefined,
  value: (row: TRow) => number,
) {
  const result = d3Bin<TRow, number>().value(value)
  if (domain) result.domain([Math.min(...domain), Math.max(...domain)])
  if (Array.isArray(thresholds)) {
    const boundaries = [...thresholds].sort((a, b) => a - b)
    if (boundaries.length < 2)
      throw new TypeError('binXY: boundary sequences require two values')
    result
      .domain([boundaries[0] as number, boundaries.at(-1) as number])
      .thresholds(boundaries.slice(1, -1))
  } else if (typeof thresholds === 'number') result.thresholds(thresholds)
  return result
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
