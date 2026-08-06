import { describe, expect, expectTypeOf, it } from 'vitest'
import { mosaicX, mosaicY } from './transform-mosaic'
import type {
  MosaicOptions,
  MosaicXDatum,
  MosaicYDatum,
} from './transform-mosaic'

interface Cell {
  id: string
  column: 'A' | 'B'
  row: 'u' | 'v'
  count: number | null | undefined
  note?: string
}

const cells: Cell[] = [
  { id: 'a-u', column: 'A', row: 'u', count: 2, note: 'preserved' },
  { id: 'b-u', column: 'B', row: 'u', count: 3 },
  { id: 'a-v', column: 'A', row: 'v', count: 2 },
  { id: 'b-v', column: 'B', row: 'v', count: 1 },
]

describe('mosaic transforms', () => {
  it('allocates mosaicY widths globally and heights within each x category', () => {
    const snapshot = cells.map((cell) => ({ ...cell }))
    cells.forEach(Object.freeze)
    Object.freeze(cells)
    const result = mosaicY(cells, {
      x: 'column',
      y: 'row',
      value: 'count',
      xOrder: ['B', 'missing', 'A'],
      yOrder: ['v', 'missing', 'u'],
    })

    expect(result.map(({ id }) => id)).toEqual(['a-u', 'b-u', 'a-v', 'b-v'])
    expect(
      result.map(
        ({
          id,
          xValue,
          yValue,
          value,
          xTotal,
          total,
          x,
          x1,
          x2,
          y,
          y1,
          y2,
        }) => ({
          id,
          xValue,
          yValue,
          value,
          xTotal,
          total,
          x,
          x1,
          x2,
          y,
          y1,
          y2,
        }),
      ),
    ).toEqual([
      {
        id: 'a-u',
        xValue: 'A',
        yValue: 'u',
        value: 2,
        xTotal: 4,
        total: 8,
        x: 0.75,
        x1: 0.5,
        x2: 1,
        y: 0.75,
        y1: 0.5,
        y2: 1,
      },
      {
        id: 'b-u',
        xValue: 'B',
        yValue: 'u',
        value: 3,
        xTotal: 4,
        total: 8,
        x: 0.25,
        x1: 0,
        x2: 0.5,
        y: 0.625,
        y1: 0.25,
        y2: 1,
      },
      {
        id: 'a-v',
        xValue: 'A',
        yValue: 'v',
        value: 2,
        xTotal: 4,
        total: 8,
        x: 0.75,
        x1: 0.5,
        x2: 1,
        y: 0.25,
        y1: 0,
        y2: 0.5,
      },
      {
        id: 'b-v',
        xValue: 'B',
        yValue: 'v',
        value: 1,
        xTotal: 4,
        total: 8,
        x: 0.25,
        x1: 0,
        x2: 0.5,
        y: 0.125,
        y1: 0,
        y2: 0.25,
      },
    ])
    expect(result[0]?.note).toBe('preserved')
    expect(result[0]?.source).toEqual([cells[0]])
    expect(result[0]?.source[0]).toBe(cells[0])
    expect(result[0]?.sourceIndexes).toEqual([0])
    expect(result).toHaveLength(cells.length)
    expect(cells).toEqual(snapshot)

    for (const cell of result) {
      expect((cell.x2 - cell.x1) * (cell.y2 - cell.y1)).toBeCloseTo(
        cell.value / cell.total,
        12,
      )
    }
  })

  it('transposes both allocation stages through mosaicX', () => {
    const result = mosaicX(cells, {
      x: 'column',
      y: 'row',
      value: 'count',
      xOrder: ['A', 'B'],
      yOrder: ['v', 'u'],
    })

    expect(
      result.map(({ id, yTotal, x1, x2, y1, y2 }) => ({
        id,
        yTotal,
        x1,
        x2,
        y1,
        y2,
      })),
    ).toEqual([
      { id: 'a-u', yTotal: 5, x1: 0, x2: 0.4, y1: 0.375, y2: 1 },
      { id: 'b-u', yTotal: 5, x1: 0.4, x2: 1, y1: 0.375, y2: 1 },
      { id: 'a-v', yTotal: 3, x1: 0, x2: 2 / 3, y1: 0, y2: 0.375 },
      { id: 'b-v', yTotal: 3, x1: 2 / 3, x2: 1, y1: 0, y2: 0.375 },
    ])
    expect(result[0]?.x).toBe(0.2)
    expect(result[0]?.y).toBe(0.6875)
    expect(result[2]?.x).toBeCloseTo(1 / 3, 12)
    expect(result[2]?.y).toBe(0.1875)
    for (const cell of result) {
      expect((cell.x2 - cell.x1) * (cell.y2 - cell.y1)).toBeCloseTo(
        cell.value / cell.total,
        12,
      )
    }
  })

  it('uses first-seen category order and appends observed categories missing from an order', () => {
    const rows = [
      { id: 'c-v', column: 'C', row: 'v', count: 1 },
      { id: 'a-u', column: 'A', row: 'u', count: 1 },
      { id: 'b-v', column: 'B', row: 'v', count: 1 },
    ]
    const natural = mosaicY(rows, {
      x: 'column',
      y: 'row',
      value: 'count',
    })
    const explicit = mosaicY(rows, {
      x: 'column',
      y: 'row',
      value: 'count',
      xOrder: ['B', 'unobserved'],
      yOrder: ['u', 'unobserved'],
    })

    expect(natural.map(({ id, x1, y1 }) => [id, x1, y1])).toEqual([
      ['c-v', 0, 0],
      ['a-u', 1 / 3, 0],
      ['b-v', 2 / 3, 0],
    ])
    expect(explicit.map(({ id, x1, y1 }) => [id, x1, y1])).toEqual([
      ['c-v', 1 / 3, 0],
      ['a-u', 2 / 3, 0],
      ['b-v', 0, 0],
    ])
    expect(explicit).toHaveLength(rows.length)
  })

  it('retains zero-valued rows and keeps all-zero geometry finite', () => {
    const rows = [
      { id: 'a', column: 'A', row: 'u', count: 0 },
      { id: 'b', column: 'B', row: 'v', count: 0 },
    ]
    const result = mosaicY(rows, {
      x: 'column',
      y: 'row',
      value: 'count',
    })

    expect(result).toHaveLength(2)
    expect(
      result.map(({ value, xTotal, total, x, x1, x2, y, y1, y2 }) => ({
        value,
        xTotal,
        total,
        x,
        x1,
        x2,
        y,
        y1,
        y2,
      })),
    ).toEqual([
      { value: 0, xTotal: 0, total: 0, x: 0, x1: 0, x2: 0, y: 0, y1: 0, y2: 0 },
      { value: 0, xTotal: 0, total: 0, x: 0, x1: 0, x2: 0, y: 0, y1: 0, y2: 0 },
    ])
  })

  it('omits invalid rows and supports generators, dates, and accessors', () => {
    const first = new Date('2026-01-01T00:00:00Z')
    const second = new Date('2026-01-02T00:00:00Z')
    const rows = [
      { id: 'valid', day: first, bucket: 'A', amount: 2 },
      { id: 'null-x', day: null as Date | null, bucket: 'A', amount: 1 },
      {
        id: 'invalid-y',
        day: second,
        bucket: null as string | null,
        amount: 1,
      },
      {
        id: 'null-value',
        day: second,
        bucket: 'B',
        amount: null as number | null,
      },
      { id: 'nan-value', day: second, bucket: 'B', amount: Number.NaN },
      {
        id: 'infinite-value',
        day: second,
        bucket: 'B',
        amount: Number.POSITIVE_INFINITY,
      },
    ]
    let seenData: readonly (typeof rows)[number][] | undefined
    function* source() {
      yield* rows
    }
    const result = mosaicY(source(), {
      x: ({ datum, index, data }) => {
        expect(data[index]).toBe(datum)
        seenData = data
        return datum.day as Date
      },
      y: ({ datum }) => datum.bucket as string,
      value: ({ datum }) => datum.amount,
      xOrder: [new Date(first)],
    })

    expect(seenData).toEqual(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'valid',
      xValue: first,
      yValue: 'A',
      value: 2,
      x1: 0,
      x2: 1,
      y1: 0,
      y2: 1,
      source: [rows[0]],
      sourceIndexes: [0],
    })
    expect(
      mosaicY([] as { day: Date; bucket: string; amount: number }[], {
        x: 'day',
        y: 'bucket',
        value: 'amount',
      }),
    ).toEqual([])
  })

  it('rejects negative values and duplicate aggregate pairs with actionable guidance', () => {
    expect(() =>
      mosaicY([{ x: 'A', y: 'u', value: -1 }], {
        x: 'x',
        y: 'y',
        value: 'value',
      }),
    ).toThrow('mosaicY: value at index 0 must be nonnegative')

    expect(() =>
      mosaicY(
        [
          { x: 'A', y: 'u', value: 1 },
          { x: 'A', y: 'u', value: 2 },
        ],
        { x: 'x', y: 'y', value: 'value' },
      ),
    ).toThrow(
      'mosaicY: duplicate x/y pair "A" / "u" at indexes 0 and 1; aggregate duplicate pairs before calling mosaicY',
    )

    const first = new Date('2026-01-01T00:00:00Z')
    const equivalent = new Date(first)
    expect(() =>
      mosaicX(
        [
          { x: first, y: 'u', value: 1 },
          { x: equivalent, y: 'u', value: 2 },
        ],
        { x: 'x', y: 'y', value: 'value' },
      ),
    ).toThrow('aggregate duplicate pairs before calling mosaicX')
  })

  it('rejects duplicate or invalid configured categories', () => {
    const rows = [{ x: 'A', y: 'u', value: 1 }]
    expect(() =>
      mosaicY(rows, {
        x: 'x',
        y: 'y',
        value: 'value',
        xOrder: ['A', 'A'],
      }),
    ).toThrow('mosaicY: xOrder contains duplicate category "A"')
    expect(() =>
      mosaicX(rows, {
        x: 'x',
        y: 'y',
        value: 'value',
        yOrder: [new Date(Number.NaN)],
      }),
    ).toThrow(
      'mosaicX: yOrder category at index 0 must be a string, finite number, or valid Date',
    )
  })

  it('keeps nested allocations finite when source totals overflow', () => {
    const maximum = Number.MAX_VALUE
    const result = mosaicY(
      [
        { id: 'a-u', x: 'A', y: 'u', value: maximum },
        { id: 'a-v', x: 'A', y: 'v', value: maximum },
        { id: 'b-u', x: 'B', y: 'u', value: maximum },
        { id: 'b-v', x: 'B', y: 'v', value: maximum },
      ],
      { x: 'x', y: 'y', value: 'value' },
    )

    expect(result.map(({ x1, x2, y1, y2 }) => [x1, x2, y1, y2])).toEqual([
      [0, 0.5, 0, 0.5],
      [0, 0.5, 0.5, 1],
      [0.5, 1, 0, 0.5],
      [0.5, 1, 0.5, 1],
    ])
    expect(
      result.every(
        ({ total, xTotal }) => total === Infinity && xTotal === Infinity,
      ),
    ).toBe(true)
    expect(
      result.every(({ x, x1, x2, y, y1, y2 }) =>
        [x, x1, x2, y, y1, y2].every(Number.isFinite),
      ),
    ).toBe(true)
  })

  it('infers semantic values, replaces derived collisions, and accepts reusable options', () => {
    const rows = [
      {
        id: 'only',
        column: 'A' as const,
        row: 'u' as const,
        amount: 2,
        xValue: 'authored',
        yValue: 'authored',
        value: 'authored',
        xTotal: 'authored',
        yTotal: 'authored',
        total: 'authored',
        x: 'authored',
        x1: 'authored',
        x2: 'authored',
        y: 'authored',
        y1: 'authored',
        y2: 'authored',
        invalid: { nested: true },
        source: 'authored',
        sourceIndexes: 'authored',
      },
    ]
    const options = {
      x: 'column',
      y: 'row',
      value: 'amount',
    } satisfies MosaicOptions<(typeof rows)[number]>
    const vertical = mosaicY(rows, options)
    const horizontal = mosaicX(rows, options)

    expectTypeOf(vertical).toEqualTypeOf<
      MosaicYDatum<(typeof rows)[number], 'A', 'u'>[]
    >()
    expectTypeOf(horizontal).toEqualTypeOf<
      MosaicXDatum<(typeof rows)[number], 'A', 'u'>[]
    >()
    expectTypeOf(vertical[0]!.xValue).toEqualTypeOf<'A'>()
    expectTypeOf(vertical[0]!.yValue).toEqualTypeOf<'u'>()
    expectTypeOf(vertical[0]!.value).toEqualTypeOf<number>()
    expectTypeOf(vertical[0]!.xTotal).toEqualTypeOf<number>()
    expectTypeOf(vertical[0]!.yTotal).toEqualTypeOf<string>()
    expectTypeOf(horizontal[0]!.yTotal).toEqualTypeOf<number>()
    expectTypeOf(horizontal[0]!.xTotal).toEqualTypeOf<string>()
    expectTypeOf(vertical[0]!.source).toEqualTypeOf<
      readonly (typeof rows)[number][]
    >()
    expect(vertical[0]).toMatchObject({
      id: 'only',
      xValue: 'A',
      yValue: 'u',
      value: 2,
      xTotal: 2,
      yTotal: 'authored',
      total: 2,
      x: 0.5,
      y: 0.5,
      source: [rows[0]],
      sourceIndexes: [0],
    })

    if (false) {
      // @ts-expect-error A mosaic x field must contain categorical values.
      mosaicY(rows, { x: 'invalid', y: 'row', value: 'amount' })
      // @ts-expect-error A mosaic value field must contain numeric or nullish values.
      mosaicY(rows, { x: 'column', y: 'row', value: 'id' })
    }
  })
})
