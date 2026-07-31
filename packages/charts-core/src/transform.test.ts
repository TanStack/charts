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
import { transformData } from './transform'
import { window } from './transform-window'
import type { WindowOptions } from './transform-window'

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
    const windowOptions: WindowOptions<Row> = { value: 'value', size: 2 }
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

  it('composes custom transforms with one context object', () => {
    const stages: number[] = []
    const output = transformData(
      rows,
      ({ data, stage }) => {
        stages.push(stage)
        return data.filter((row) => row.group === 'A')
      },
      ({ data, stage }) => {
        stages.push(stage)
        return data.map((row) => row.value)
      },
    )

    expect(output).toEqual([1, 3])
    expect(stages).toEqual([0, 1])
    expectTypeOf(output).toEqualTypeOf<number[]>()
  })

  it('groups once, derives multiple outputs, and preserves lineage', () => {
    const grouped = groupBy(rows, {
      by: 'group',
      outputs: {
        count: { reduce: 'count' },
        total: { value: 'value', reduce: 'sum' },
        range: {
          value: 'value',
          reduce: ({ values, data, indexes, key }) => {
            expect(data).toHaveLength(indexes.length)
            expect(['A', 'B']).toContain(key)
            return Math.max(...values) - Math.min(...values)
          },
        },
      },
    })

    expect(
      grouped.map(({ key, count, total, range }) => ({
        key,
        count,
        total,
        range,
      })),
    ).toEqual([
      { key: 'A', count: 2, total: 4, range: 2 },
      { key: 'B', count: 2, total: 6, range: 2 },
    ])
    expect(grouped[0]?.source).toEqual(rows.slice(0, 2))
    expect(grouped[0]?.sourceIndexes).toEqual([0, 1])
    expectTypeOf(grouped[0]!.key).toEqualTypeOf<'A' | 'B'>()
    expectTypeOf(grouped[0]!.count).toEqualTypeOf<number>()
    expectTypeOf(grouped[0]!.total).toEqualTypeOf<number>()
    expectTypeOf(grouped[0]!.range).toEqualTypeOf<number>()
    expect(() =>
      groupBy(rows, {
        by: 'group',
        outputs: { key: { reduce: 'count' } },
      }),
    ).toThrow(/output name "key" is reserved/)
  })

  it('supports tuple grouping keys from an accessor context', () => {
    const grouped = groupBy(rows, {
      by: ({ datum, index, data }) => {
        expect(data[index]).toBe(datum)
        return [datum.group, datum.category] as const
      },
      outputs: { count: { reduce: 'count' } },
    })

    expect(grouped.map(({ key, count }) => ({ key, count }))).toEqual([
      { key: ['A', 'x'], count: 2 },
      { key: ['B', 'x'], count: 1 },
      { key: ['B', 'y'], count: 1 },
    ])

    const missing = groupBy(
      [{ group: 'A' as string | undefined }, { group: undefined }],
      { by: 'group', outputs: { count: { reduce: 'count' } } },
    )
    expect(missing.map(({ key, count }) => ({ key, count }))).toEqual([
      { key: 'A', count: 1 },
      { key: undefined, count: 1 },
    ])
    expectTypeOf(missing[0]!.key).toEqualTypeOf<string | undefined>()
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
        value: ({ datum }) => datum,
        thresholds: [0, 2, 4],
      },
    )

    expect(
      xBins.map(({ key, x1, x2, count }) => ({ key, x1, x2, count })),
    ).toEqual([
      { key: 'A', x1: 0, x2: 2, count: 1 },
      { key: 'A', x1: 2, x2: 4, count: 1 },
      { key: 'B', x1: 0, x2: 2, count: 0 },
      { key: 'B', x1: 2, x2: 4, count: 2 },
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
      ).map(({ key, value }) => ({ key, value })),
    ).toEqual([
      { key: 'A', value: 0 },
      { key: 'B', value: 1 },
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
  })

  it('derives grouped rolling outputs without hiding source windows', () => {
    const rolling = window(rows, {
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
      rolling.map(({ datum, key, average, spread, sourceIndexes }) => ({
        id: datum.id,
        key,
        average,
        spread,
        sourceIndexes,
      })),
    ).toEqual([
      { id: 'a1', key: 'A', average: 2, spread: 2, sourceIndexes: [0, 1] },
      { id: 'b1', key: 'B', average: 3, spread: 2, sourceIndexes: [2, 3] },
    ])
    expect(() => window(rows, { value: 'value', size: 0 })).toThrow(
      /positive finite number/,
    )
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

    expect(normalized.map(({ datum, value }) => [datum.id, value])).toEqual([
      ['a0', 0.25],
      ['a1', 0.75],
      ['b0', 1 / 3],
      ['b1', 2 / 3],
    ])
    expect(maxima.map((row) => row.id)).toEqual(['a1', 'b1'])
    expect(
      select(rows, {
        by: 'group',
        select: ({ indexes, key }) => {
          expectTypeOf(key).toEqualTypeOf<'A' | 'B'>()
          return indexes.includes(0) ? 3 : 0
        },
      }),
    ).toEqual([])
    if (false) {
      // @ts-expect-error Numeric extrema require a value accessor.
      select(rows, { select: 'min' })
    }
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
