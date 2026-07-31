import type {
  TransformGroupSpec,
  TransformLineage,
  TransformOrder,
  TransformValue,
} from './transform'
import {
  materializeGroups,
  toArray,
  transformValues,
} from './transform-internal'

export type RankTies = 'competition' | 'dense' | 'ordinal'

export interface RankOptions<TDatum> {
  value: TransformValue<TDatum, number | null | undefined>
  by?: TransformGroupSpec<TDatum>
  order?: TransformOrder
  ties?: RankTies
  as?: string
}

export type RankDatum<TDatum, TAs extends string> = Omit<
  TDatum,
  TAs | keyof TransformLineage<TDatum>
> &
  TransformLineage<TDatum> & { readonly [TKey in TAs]: number }

export function rank<
  TDatum extends object,
  const TBy extends TransformGroupSpec<TDatum> | undefined = undefined,
  const TAs extends string = 'rank',
>(
  source: Iterable<TDatum>,
  options: RankOptions<TDatum> & { by?: TBy; as?: TAs },
): RankDatum<TDatum, TAs>[] {
  const data = toArray(source)
  const values = transformValues(data, options.value)
  const outputName = options.as ?? 'rank'
  assertOutputName(outputName, 'rank')
  const ranks = new Map<number, number>()
  for (const { indexes } of materializeGroups(data, options.by)) {
    const direction = options.order === 'ascending' ? 1 : -1
    const sorted = indexes
      .filter((index) => isFiniteNumber(values[index]))
      .sort((left, right) => {
        const difference = (values[left] as number) - (values[right] as number)
        return difference === 0 ? left - right : difference * direction
      })
    let dense = 0
    let previous: number | undefined
    sorted.forEach((index, position) => {
      const value = values[index] as number
      if (previous === undefined || value !== previous) dense += 1
      const resolved =
        options.ties === 'ordinal'
          ? position + 1
          : options.ties === 'dense'
            ? dense
            : previous === undefined || value !== previous
              ? position + 1
              : (ranks.get(sorted[position - 1] as number) as number)
      ranks.set(index, resolved)
      previous = value
    })
  }
  return data.flatMap((datum, index) => {
    const value = ranks.get(index)
    return value === undefined
      ? []
      : [
          {
            ...datum,
            [outputName]: value,
            source: [datum],
            sourceIndexes: [index],
          } as RankDatum<TDatum, TAs>,
        ]
  })
}

function assertOutputName(name: string, transform: string) {
  if (name === 'source' || name === 'sourceIndexes') {
    throw new TypeError(`${transform}: output name "${name}" is reserved`)
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
