import { describe, expect, expectTypeOf, it } from 'vitest'
import { binX, binY } from './transform-bin'
import type { BinOptions } from './transform-bin'
import { groupBy } from './transform-group'
import type { GroupByOptions } from './transform-group'
import { normalize } from './transform-normalize'
import type { NormalizeOptions } from './transform-normalize'
import { select } from './transform-select'
import type { SelectOptions } from './transform-select'
import { stackRowsX, stackRowsY } from './transform-stack'
import type { StackRowsYOptions } from './transform-stack'
import { rollingWindow } from './transform-rolling-window'
import type { RollingWindowOptions } from './transform-rolling-window'
import { cumulative } from './transform-cumulative'
import { rank } from './transform-rank'
import {
  deviation,
  delta,
  first,
  last,
  median,
  quantile,
  ratio,
  variance,
} from './transform-reduce'
import { binXY } from './transform-bin-xy'
import { binTimeX } from './transform-bin-time'

interface Row {
  id: string
  group: 'A' | 'B'
  category: string
  value: number
}

const rows: Row[] = [
  { id: 'a0', group: 'A', category: 'x', value: 1 },
  { id: 'a1', group: 'A', category: 'x', value: 3 },
  { id: 'b0', group: 'B', category: 'x', value: 2 },
  { id: 'b1', group: 'B', category: 'y', value: 4 },
]

describe('data transforms', () => {
  it('exports hoistable option bags without inference-only type arguments', () => {
    const groupOptions: GroupByOptions<Row> = {
      by: 'group',
      outputs: { total: { value: 'value', reduce: 'sum' } },
    }
    const binOptions: BinOptions<Row> = { value: 'value', thresholds: 4 }
    const windowOptions: RollingWindowOptions<Row> = {
      size: 2,
      outputs: { average: { value: 'value', reduce: 'mean' } },
    }
    const normalizeOptions: NormalizeOptions<Row> = {
      value: 'value',
      by: 'group',
    }
    const selectOptions: SelectOptions<Row> = {
      by: 'group',
      value: 'value',
      select: 'max',
    }
    const stackOptions: StackRowsYOptions<Row> = {
      x: 'group',
      y: 'value',
      z: 'category',
    }

    expect([
      groupOptions,
      binOptions,
      windowOptions,
      normalizeOptions,
      selectOptions,
      stackOptions,
    ]).toHaveLength(6)
  })

  it('groups once, derives multiple outputs, and preserves lineage', () => {
    const grouped = groupBy(rows, {
      by: 'group',
      outputs: {
        count: { reduce: 'count' },
        total: { value: 'value', reduce: 'sum' },
        range: {
          value: 'value',
          reduce: ({ values, data, indexes, group }) => {
            expect(data).toHaveLength(indexes.length)
            expect(['A', 'B']).toContain(group.group)
            return Math.max(...values) - Math.min(...values)
          },
        },
      },
    })

    expect(
      grouped.map(({ group, count, total, range }) => ({
        group,
        count,
        total,
        range,
      })),
    ).toEqual([
      { group: 'A', count: 2, total: 4, range: 2 },
      { group: 'B', count: 2, total: 6, range: 2 },
    ])
    expect(grouped[0]?.source).toEqual(rows.slice(0, 2))
    expect(grouped[0]?.sourceIndexes).toEqual([0, 1])
    expectTypeOf(grouped[0]!.group).toEqualTypeOf<'A' | 'B'>()
    expectTypeOf(grouped[0]!.count).toEqualTypeOf<number>()
    expectTypeOf(grouped[0]!.total).toEqualTypeOf<number>()
    expectTypeOf(grouped[0]!.range).toEqualTypeOf<number>()
    expect(() =>
      groupBy(rows, {
        by: 'group',
        outputs: { group: { reduce: 'count' } },
      }),
    ).toThrow(/output name "group" is reserved/)
  })

  it('emits named compound grouping fields', () => {
    const grouped = groupBy(rows, {
      by: {
        group: 'group',
        category: (datum, { index, data }) => {
          expect(data[index]).toBe(datum)
          return datum.category
        },
      },
      outputs: { count: { reduce: 'count' } },
    })

    expect(
      grouped.map(({ group, category, count }) => ({ group, category, count })),
    ).toEqual([
      { group: 'A', category: 'x', count: 2 },
      { group: 'B', category: 'x', count: 1 },
      { group: 'B', category: 'y', count: 1 },
    ])

    const missing = groupBy(
      [{ group: 'A' as string | undefined }, { group: undefined }],
      { by: 'group', outputs: { count: { reduce: 'count' } } },
    )
    expect(missing.map(({ group, count }) => ({ group, count }))).toEqual([
      { group: 'A', count: 1 },
      { group: undefined, count: 1 },
    ])
    expectTypeOf(missing[0]!.group).toEqualTypeOf<string | undefined>()
  })

  it('bins on either axis with aligned grouped boundaries', () => {
    const xBins = binX(rows, {
      value: 'value',
      by: 'group',
      thresholds: [0, 2, 4],
      outputs: {
        count: { reduce: 'count' },
        average: { value: 'value', reduce: 'mean' },
      },
    })
    const yBins = binY(
      rows.map((row) => row.value),
      {
        value: (datum) => datum,
        thresholds: [0, 2, 4],
      },
    )

    expect(
      xBins.map(({ group, x1, x2, count }) => ({ group, x1, x2, count })),
    ).toEqual([
      { group: 'A', x1: 0, x2: 2, count: 1 },
      { group: 'A', x1: 2, x2: 4, count: 1 },
      { group: 'B', x1: 0, x2: 2, count: 0 },
      { group: 'B', x1: 2, x2: 4, count: 2 },
    ])
    expect(yBins.map(({ y1, y2, value }) => ({ y1, y2, value }))).toEqual([
      { y1: 0, y2: 2, value: 1 },
      { y1: 2, y2: 4, value: 3 },
    ])
    expect(
      binX([] as Row[], { value: 'value', thresholds: [0, 2, 4] }).map(
        ({ x1, x2, value }) => ({ x1, x2, value }),
      ),
    ).toEqual([
      { x1: 0, x2: 2, value: 0 },
      { x1: 2, x2: 4, value: 0 },
    ])
    expect(
      binX(
        [
          { group: 'A', value: null as number | null },
          { group: 'B', value: 1 },
        ],
        { value: 'value', by: 'group', thresholds: [0, 2] },
      ).map(({ group, value }) => ({ group, value })),
    ).toEqual([
      { group: 'A', value: 0 },
      { group: 'B', value: 1 },
    ])
    expect(xBins[2]!.average).toBeNaN()
    expectTypeOf(xBins[0]!.average).toEqualTypeOf<number>()
    expect(() =>
      binX(rows, {
        value: 'value',
        domain: [0, 5],
        thresholds: [0, 2, 4],
      }),
    ).toThrow(/must match/)
    expect(() => binX(rows, { value: 'value', thresholds: [0] })).toThrow(
      /requires two values/,
    )
    expect(() => binX(rows, { value: 'value', thresholds: 0 })).toThrow(
      /positive finite number/,
    )
    expect(
      binX(rows, {
        value: 'value',
        thresholds: () => 1,
      }),
    ).toHaveLength(1)
  })

  it('bins two dimensions and calendar intervals without coupling their bundles', () => {
    const cells = binXY(rows, {
      x: 'value',
      y: (datum) => (datum.category === 'x' ? 0 : 1),
      xThresholds: [0, 2, 4],
      yThresholds: [0, 1, 2],
    })
    expect(cells.map(({ x1, y1, value }) => [x1, y1, value])).toEqual([
      [0, 0, 1],
      [0, 1, 0],
      [2, 0, 2],
      [2, 1, 1],
    ])
    const day = {
      floor: (date: Date) =>
        new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
          ),
        ),
      offset: (date: Date, step = 1) =>
        new Date(date.getTime() + step * 86_400_000),
      range(start: Date, stop: Date, step = 1) {
        const values: Date[] = []
        for (let value = start; value < stop; value = this.offset(value, step))
          values.push(value)
        return values
      },
    }
    const dates = binTimeX(
      [
        { at: new Date('2026-01-01T12:00:00Z') },
        { at: new Date('2026-01-03T12:00:00Z') },
      ],
      { value: 'at', interval: day },
    )
    expect(
      dates.map(({ x1, value }) => [x1.toISOString().slice(0, 10), value]),
    ).toEqual([
      ['2026-01-01', 1],
      ['2026-01-02', 0],
      ['2026-01-03', 1],
    ])
  })

  it('derives grouped rolling outputs without hiding source windows', () => {
    const rolling = rollingWindow(rows, {
      by: 'group',
      size: 2,
      partial: false,
      outputs: {
        average: { value: 'value', reduce: 'mean' },
        spread: {
          value: 'value',
          reduce: ({ values }) => Math.max(...values) - Math.min(...values),
        },
      },
    })

    expect(
      rolling.map(({ id, group, average, spread, sourceIndexes }) => ({
        id,
        group,
        average,
        spread,
        sourceIndexes,
      })),
    ).toEqual([
      { id: 'a1', group: 'A', average: 2, spread: 2, sourceIndexes: [0, 1] },
      { id: 'b1', group: 'B', average: 3, spread: 2, sourceIndexes: [2, 3] },
    ])
    expect(() =>
      rollingWindow(rows, {
        size: 0,
        outputs: { total: { value: 'value', reduce: 'sum' } },
      }),
    ).toThrow(/positive finite number/)
  })

  it('normalizes within groups and selects original rows', () => {
    const normalized = normalize(rows, {
      value: 'value',
      by: 'group',
      basis: 'sum',
    })
    const maxima = select(rows, {
      by: 'group',
      value: 'value',
      select: 'max',
    })

    expect(normalized.map(({ id, normalized }) => [id, normalized])).toEqual([
      ['a0', 0.25],
      ['a1', 0.75],
      ['b0', 1 / 3],
      ['b1', 2 / 3],
    ])
    expect(maxima.map((row) => row.id)).toEqual(['a1', 'b1'])
    expect(
      select(rows, {
        by: 'group',
        select: ({ indexes, group }) => {
          expect(group.group).toMatch(/A|B/)
          return indexes.includes(0) ? 3 : 0
        },
      }),
    ).toEqual([])
    if (false) {
      // @ts-expect-error Numeric extrema require a value accessor.
      select(rows, { select: 'min' })
    }
  })

  it('orders rolling, cumulative, and rank calculations explicitly', () => {
    const shuffled = [rows[1]!, rows[0]!, rows[3]!, rows[2]!]
    const rolling = rollingWindow(shuffled, {
      by: 'group',
      orderBy: 'id',
      size: 2,
      partial: false,
      outputs: { change: { value: 'value', reduce: delta } },
    })
    const totals = cumulative(shuffled, {
      by: 'group',
      orderBy: 'id',
      outputs: { running: { value: 'value', reduce: 'sum' } },
    })
    const ranked = rank(rows, { by: 'group', value: 'value', ties: 'dense' })
    expect(rolling.map(({ id, change }) => [id, change])).toEqual([
      ['a1', 2],
      ['b1', 2],
    ])
    expect(totals.map(({ id, running }) => [id, running])).toEqual([
      ['a0', 1],
      ['a1', 4],
      ['b0', 2],
      ['b1', 6],
    ])
    expect(ranked.map(({ rank }) => rank)).toEqual([2, 1, 2, 1])
    expect(
      quantile<Row>(0.5)({
        values: [1, 2, 9],
        data: rows,
        indexes: [0, 1, 2],
        group: {},
      }),
    ).toBe(2)
    const reducerContext = {
      values: [1, 2, 3],
      data: rows,
      indexes: [0, 1, 2],
      group: {},
    }
    expect({
      median: median(reducerContext),
      variance: variance(reducerContext),
      deviation: deviation(reducerContext),
      first: first(reducerContext),
      last: last(reducerContext),
      delta: delta(reducerContext),
      ratio: ratio(reducerContext),
    }).toEqual({
      median: 2,
      variance: 1,
      deviation: 1,
      first: 1,
      last: 3,
      delta: 2,
      ratio: 3,
    })
  })

  it('materializes explicit row stacks through the mark stack engine', () => {
    const stackData = [
      { category: 'x', group: 'A', value: 1 },
      { category: 'x', group: 'B', value: 2 },
      { category: 'y', group: 'A', value: 3 },
      { category: 'y', group: 'B', value: 4 },
    ] as const
    const yStack = stackRowsY(stackData, {
      x: 'category',
      y: 'value',
      z: 'group',
      order: ['B', 'A'],
    })
    const xStack = stackRowsX(stackData, {
      x: 'value',
      y: 'category',
      z: 'group',
    })

    expect(yStack.map(({ x, z, y1, y2 }) => ({ x, z, y1, y2 }))).toEqual([
      { x: 'x', z: 'A', y1: 2, y2: 3 },
      { x: 'x', z: 'B', y1: 0, y2: 2 },
      { x: 'y', z: 'A', y1: 4, y2: 7 },
      { x: 'y', z: 'B', y1: 0, y2: 4 },
    ])
    expect(xStack.map(({ x1, x2 }) => [x1, x2])).toEqual([
      [0, 1],
      [1, 3],
      [0, 3],
      [3, 7],
    ])
    expect(
      stackRowsY(
        [
          { category: 'A' as string | null, group: 'x', value: 1 },
          { category: null, group: 'x', value: 2 },
        ],
        { x: 'category', y: 'value', z: 'group' },
      ),
    ).toHaveLength(1)
    expect(
      stackRowsY(
        [
          { category: 'A', group: null as string | null, value: 100 },
          { category: 'A', group: 'x', value: 1 },
        ],
        { x: 'category', y: 'value', z: 'group' },
      ).map(({ y1, y2 }) => [y1, y2]),
    ).toEqual([[0, 1]])
  })
})
