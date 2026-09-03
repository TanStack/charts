import type { TransformLineage } from './transform'
import { toArray } from './transform-internal'

export type FoldField<TDatum> = Extract<keyof TDatum, string>

export interface FoldOutputNames<
  TKey extends string = 'key',
  TValue extends string = 'value',
> {
  readonly key: TKey
  readonly value: TValue
}

export interface FoldOptions<
  TDatum,
  TFields extends readonly FoldField<TDatum>[] = readonly FoldField<TDatum>[],
  TOutputNames extends FoldOutputNames<string, string> = FoldOutputNames<
    'key',
    'value'
  >,
> {
  readonly fields: TFields
  readonly as?: TOutputNames
}

type FoldFieldDatum<
  TDatum extends object,
  TField extends FoldField<TDatum>,
  TOutputNames extends FoldOutputNames<string, string>,
> =
  TField extends FoldField<TDatum>
    ? Omit<
        TDatum,
        | keyof TransformLineage<TDatum>
        | TOutputNames['key']
        | TOutputNames['value']
      > &
        TransformLineage<TDatum> & {
          readonly [TKey in TOutputNames['key']]: TField
        } & { readonly [TValue in TOutputNames['value']]: TDatum[TField] }
    : never

export type FoldDatum<
  TDatum extends object,
  TFields extends readonly FoldField<TDatum>[],
  TOutputNames extends FoldOutputNames<string, string> = FoldOutputNames<
    'key',
    'value'
  >,
> = FoldFieldDatum<TDatum, TFields[number], TOutputNames>

type LiteralFoldFields<TFields extends readonly string[]> =
  number extends TFields['length'] ? never : TFields

export function fold<
  TDatum extends object,
  const TFields extends readonly FoldField<TDatum>[],
>(
  source: Iterable<TDatum>,
  options: {
    readonly fields: LiteralFoldFields<TFields>
    readonly as?: undefined
  },
): FoldDatum<TDatum, TFields>[]

export function fold<
  TDatum extends object,
  const TFields extends readonly FoldField<TDatum>[],
  const TOutputNames extends FoldOutputNames<string, string>,
>(
  source: Iterable<TDatum>,
  options: {
    readonly fields: LiteralFoldFields<TFields>
    readonly as: TOutputNames
  },
): FoldDatum<TDatum, TFields, TOutputNames>[]

export function fold<TDatum extends object>(
  source: Iterable<TDatum>,
  options: FoldOptions<
    TDatum,
    readonly FoldField<TDatum>[],
    FoldOutputNames<string, string>
  >,
): object[] {
  const data = toArray(source)
  const keyName = options.as?.key ?? 'key'
  const valueName = options.as?.value ?? 'value'

  assertFoldOptions(options.fields, keyName, valueName)

  return data.flatMap((datum, sourceIndex) =>
    options.fields.map((field) => ({
      ...datum,
      source: [datum],
      sourceIndexes: [sourceIndex],
      [keyName]: field,
      [valueName]: datum[field],
    })),
  )
}

function assertFoldOptions(
  fields: readonly string[],
  keyName: string,
  valueName: string,
): void {
  if (keyName === valueName) {
    throw new TypeError('fold: output names must be distinct')
  }

  for (const name of [keyName, valueName]) {
    if (name === 'source' || name === 'sourceIndexes') {
      throw new TypeError(`fold: output name "${name}" is reserved`)
    }
  }

  const seen = new Set<string>()
  for (const field of fields) {
    if (seen.has(field)) {
      throw new TypeError(`fold: duplicate field "${field}"`)
    }
    seen.add(field)
  }
}
