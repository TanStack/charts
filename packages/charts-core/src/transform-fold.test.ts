import { describe, expect, expectTypeOf, it } from 'vitest'
import { fold } from './transform-fold'
import type {
  FoldDatum,
  FoldField,
  FoldOptions,
  FoldOutputNames,
} from './transform-fold'

interface Row {
  id: string
  group: 'A' | 'B'
  count: number
  label: string
}

const rows: Row[] = [
  { id: 'a', group: 'A', count: 2, label: 'Alpha' },
  { id: 'b', group: 'B', count: 4, label: 'Beta' },
]

describe('fold', () => {
  it('emits source-major rows in authored field order with direct lineage', () => {
    const output = fold(rows, { fields: ['label', 'count'] })

    expect(
      output.map(({ id, group, key, value, sourceIndexes }) => ({
        id,
        group,
        key,
        value,
        sourceIndexes,
      })),
    ).toEqual([
      {
        id: 'a',
        group: 'A',
        key: 'label',
        value: 'Alpha',
        sourceIndexes: [0],
      },
      {
        id: 'a',
        group: 'A',
        key: 'count',
        value: 2,
        sourceIndexes: [0],
      },
      {
        id: 'b',
        group: 'B',
        key: 'label',
        value: 'Beta',
        sourceIndexes: [1],
      },
      {
        id: 'b',
        group: 'B',
        key: 'count',
        value: 4,
        sourceIndexes: [1],
      },
    ])
    expect(output[0]?.source).toEqual([rows[0]])
    expect(output[0]?.source[0]).toBe(rows[0])
    expect(output[2]?.source).toEqual([rows[1]])
    expect(output[2]?.source[0]).toBe(rows[1])
  })

  it('supports custom output names and overrides source fields', () => {
    const source = [
      { id: 'a', metric: 'old', reading: -1, current: 8, previous: 5 },
    ]
    const output = fold(source, {
      fields: ['current', 'previous'],
      as: { key: 'metric', value: 'reading' },
    })

    expect(output).toMatchObject([
      { id: 'a', metric: 'current', reading: 8 },
      { id: 'a', metric: 'previous', reading: 5 },
    ])
    expect(output[0]?.source[0]).toBe(source[0])
  })

  it('preserves every selected value without filtering or copying it', () => {
    const reference = { nested: true }
    const source = [
      {
        nil: null,
        missing: undefined,
        disabled: false,
        invalid: Number.NaN,
        reference,
      },
    ]
    const output = fold(source, {
      fields: ['nil', 'missing', 'disabled', 'invalid', 'reference'],
    })

    expect(output).toHaveLength(5)
    expect(output.map(({ key }) => key)).toEqual([
      'nil',
      'missing',
      'disabled',
      'invalid',
      'reference',
    ])
    expect(output[0]?.value).toBeNull()
    expect(output[1]?.value).toBeUndefined()
    expect(output[2]?.value).toBe(false)
    expect(output[3]?.value).toBeNaN()
    expect(output[4]?.value).toBe(reference)
  })

  it('materializes iterable input once without mutating rows or adding ids', () => {
    const first = Object.freeze({ value: 1 })
    const second = Object.freeze({ value: 2 })
    let iterations = 0
    function* source() {
      iterations += 1
      yield first
      yield second
    }

    const output = fold(source(), { fields: ['value'] })

    expect(iterations).toBe(1)
    expect(output).toHaveLength(2)
    expect(output[0]).not.toHaveProperty('id')
    expect(first).toEqual({ value: 1 })
    expect(second).toEqual({ value: 2 })
  })

  it('returns an empty array for empty inputs or an empty field tuple', () => {
    expect(fold([] as Row[], { fields: ['count'] })).toEqual([])
    expect(fold(rows, { fields: [] })).toEqual([])
  })

  it('rejects ambiguous fields and output names', () => {
    expect(() => fold(rows, { fields: ['count', 'count'] })).toThrow(
      'fold: duplicate field "count"',
    )
    expect(() =>
      fold(rows, {
        fields: ['count'],
        as: { key: 'metric', value: 'metric' },
      }),
    ).toThrow('fold: output names must be distinct')
    expect(() =>
      fold(rows, {
        fields: ['count'],
        as: { key: 'source', value: 'reading' },
      }),
    ).toThrow('fold: output name "source" is reserved')
    expect(() =>
      fold(rows, {
        fields: ['count'],
        as: { key: 'metric', value: 'sourceIndexes' },
      }),
    ).toThrow('fold: output name "sourceIndexes" is reserved')
  })

  it('correlates each key literal with its field value type', () => {
    const output = fold(rows, { fields: ['count', 'label'] })
    const datum = output[0]!

    if (datum.key === 'count') {
      expectTypeOf(datum.value).toEqualTypeOf<number>()
    } else {
      expectTypeOf(datum.key).toEqualTypeOf<'label'>()
      expectTypeOf(datum.value).toEqualTypeOf<string>()
    }

    const renamed = fold(rows, {
      fields: ['count', 'label'],
      as: { key: 'metric', value: 'reading' },
    })
    const renamedDatum = renamed[0]!
    if (renamedDatum.metric === 'count') {
      expectTypeOf(renamedDatum.reading).toEqualTypeOf<number>()
    } else {
      expectTypeOf(renamedDatum.metric).toEqualTypeOf<'label'>()
      expectTypeOf(renamedDatum.reading).toEqualTypeOf<string>()
    }
  })

  it('exports reusable field, option, output-name, and datum types', () => {
    const field: FoldField<Row> = 'count'
    const names: FoldOutputNames<'metric', 'reading'> = {
      key: 'metric',
      value: 'reading',
    }
    const options: FoldOptions<Row, readonly ['count', 'label'], typeof names> =
      {
        fields: ['count', 'label'],
        as: names,
      }
    type Output = FoldDatum<Row, readonly ['count', 'label']>
    const output: Output = fold(rows, { fields: ['count', 'label'] })[0]!
    type DefaultNames = NonNullable<FoldOptions<Row, readonly ['count']>['as']>

    expect(field).toBe('count')
    expect(options.as).toBe(names)
    expectTypeOf<DefaultNames>().toEqualTypeOf<
      FoldOutputNames<'key', 'value'>
    >()
    if (output.key === 'count') {
      expectTypeOf(output.value).toEqualTypeOf<number>()
    } else {
      expectTypeOf(output.value).toEqualTypeOf<string>()
    }
  })

  it('requires literal field tuples and complete output-name pairs', () => {
    if (false) {
      // @ts-expect-error Fold fields must name source properties.
      fold(rows, { fields: ['unknown'] })
      // @ts-expect-error Fold fields do not accept accessors.
      fold(rows, { fields: [({ datum }: { datum: Row }) => datum.count] })
      const fields: (keyof Row)[] = ['count', 'label']
      // @ts-expect-error Fold fields must be an authored literal tuple.
      fold(rows, { fields })
      // @ts-expect-error Renaming requires both output names.
      fold(rows, { fields: ['count'], as: { key: 'metric' } })
      // @ts-expect-error Renaming requires both output names.
      fold(rows, { fields: ['count'], as: { value: 'reading' } })
    }
  })
})
