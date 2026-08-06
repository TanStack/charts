import { describe, expect, expectTypeOf, it } from 'vitest'
import type { WaterfallKind, WaterfallOptions } from './transform-waterfall'
import { waterfall } from './transform-waterfall'

interface Row {
  id: string
  group: 'A' | 'B'
  sequence: number
  amount: number | null | undefined
}

describe('waterfall', () => {
  it('orders signed contributions, preserves zeroes, and appends aggregate lineage', () => {
    const rows: Row[] = [
      { id: 'decrease', group: 'A', sequence: 2, amount: -3 },
      { id: 'increase', group: 'A', sequence: 1, amount: 5 },
      { id: 'missing', group: 'A', sequence: 3, amount: null },
      { id: 'zero', group: 'A', sequence: 4, amount: 0 },
    ]
    const sourceSnapshot = rows.map((row) => ({ ...row }))
    rows.forEach(Object.freeze)
    Object.freeze(rows)
    const options: WaterfallOptions<Row> = {
      value: 'amount',
      orderBy: 'sequence',
      total: true,
    }
    const result = waterfall(rows, options)

    expect(
      result.map(({ delta, start, end, kind }) => ({
        delta,
        start,
        end,
        kind,
      })),
    ).toEqual([
      { delta: 5, start: 0, end: 5, kind: 'increase' },
      { delta: -3, start: 5, end: 2, kind: 'decrease' },
      { delta: 0, start: 2, end: 2, kind: 'increase' },
      { delta: 2, start: 0, end: 2, kind: 'total' },
    ])
    expect(result[0]?.source).toEqual([rows[1]])
    expect(result[0]?.sourceIndexes).toEqual([1])
    expect(result.at(-1)?.source).toEqual([rows[1], rows[0], rows[3]])
    expect(result.at(-1)?.sourceIndexes).toEqual([1, 0, 3])
    expect(rows).toEqual(sourceSnapshot)
    expect(rows.every((row) => !('start' in row) && !('end' in row))).toBe(true)
    expectTypeOf(result[0]!.kind).toEqualTypeOf<WaterfallKind>()
  })

  it('accumulates descending groups independently in first-seen group order', () => {
    const rows: Row[] = [
      { id: 'b2', group: 'B', sequence: 2, amount: -1 },
      { id: 'a1', group: 'A', sequence: 1, amount: 4 },
      { id: 'b1', group: 'B', sequence: 1, amount: 3 },
    ]
    const result = waterfall(rows, {
      value: 'amount',
      by: { team: 'group' },
      orderBy: 'sequence',
      order: 'descending',
      total: true,
    })

    expect(
      result.map((row) => ({
        id: row.kind === 'total' ? undefined : row.id,
        team: 'team' in row ? row.team : undefined,
        start: row.start,
        end: row.end,
        kind: row.kind,
      })),
    ).toEqual([
      { id: 'b2', team: undefined, start: 0, end: -1, kind: 'decrease' },
      { id: 'b1', team: undefined, start: -1, end: 2, kind: 'increase' },
      { id: undefined, team: 'B', start: 0, end: 2, kind: 'total' },
      { id: 'a1', team: undefined, start: 0, end: 4, kind: 'increase' },
      { id: undefined, team: 'A', start: 0, end: 4, kind: 'total' },
    ])
  })

  it('rejects total group names that collide with derived fields', () => {
    const rows = [{ group: 'A', kind: 'input', amount: 1 }] as const

    expect(() =>
      waterfall(rows, {
        value: 'amount',
        by: { start: 'group' },
        total: true,
      }),
    ).toThrow('waterfall: group name "start" is reserved when total is true')
    expect(() =>
      waterfall(rows, { value: 'amount', by: 'kind', total: true }),
    ).toThrow('waterfall: group name "kind" is reserved when total is true')
  })

  it('omits invalid values and does not invent empty totals', () => {
    expect(
      waterfall(
        [
          { value: null as number | null },
          { value: Number.NaN },
          { value: undefined },
        ],
        { value: 'value', total: true },
      ),
    ).toEqual([])
    expect(waterfall([{ value: 2 }], { value: 'value' })).toHaveLength(1)
  })

  it('rejects cumulative numeric overflow', () => {
    expect(() =>
      waterfall([{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE }], {
        value: 'value',
        total: true,
      }),
    ).toThrow('waterfall: cumulative value at index 1 must be finite')
  })
})
