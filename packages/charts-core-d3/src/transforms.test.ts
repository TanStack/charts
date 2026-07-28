import { describe, expect, expectTypeOf, it } from 'vitest'
import { bin, group, stackY, type GroupDatum } from './transforms'

describe('visualization transforms', () => {
  it('groups arbitrary data and retains source rows', () => {
    const data = [
      { category: 'A', value: 2 },
      { category: 'A', value: 5 },
      { category: 'B', value: 3 },
    ]
    const grouped = group(data, {
      by: 'category',
      value: 'value',
      reduce: 'sum',
    })

    expectTypeOf(grouped).toEqualTypeOf<GroupDatum<(typeof data)[number]>[]>()
    expect(grouped.map(({ key, value }) => ({ key, value }))).toEqual([
      { key: 'A', value: 7 },
      { key: 'B', value: 3 },
    ])
    expect(grouped[0]?.data).toEqual(data.slice(0, 2))
  })

  it('bins values with deterministic boundaries and includes the domain max', () => {
    const data = [{ value: 0 }, { value: 2 }, { value: 5 }, { value: 10 }]
    const bins = bin(data, {
      value: 'value',
      thresholds: 2,
      domain: [0, 10],
    })

    expect(bins).toMatchObject([
      { x1: 0, x2: 5, value: 2 },
      { x1: 5, x2: 10, value: 2 },
    ])
    expect(bins[1]?.data.at(-1)).toBe(data.at(-1))
  })

  it('keeps ten bins as the default API contract', () => {
    expect(
      bin([0, 10], {
        value: (value) => value,
        domain: [0, 10],
      }),
    ).toHaveLength(10)
  })

  it('creates diverging stacks with stable series order', () => {
    const data = [
      { quarter: 'Q1', product: 'B', value: 3 },
      { quarter: 'Q1', product: 'A', value: 2 },
      { quarter: 'Q1', product: 'C', value: -4 },
      { quarter: 'Q2', product: 'A', value: 5 },
    ]
    const stacked = stackY(data, {
      x: 'quarter',
      y: 'value',
      z: 'product',
      order: ['A', 'B', 'C'],
    })

    expect(stacked.map(({ x, z, y1, y2 }) => ({ x, z, y1, y2 }))).toEqual([
      { x: 'Q1', z: 'A', y1: 0, y2: 2 },
      { x: 'Q1', z: 'B', y1: 2, y2: 5 },
      { x: 'Q1', z: 'C', y1: 0, y2: -4 },
      { x: 'Q2', z: 'A', y1: 0, y2: 5 },
    ])
    expect(stacked[0]?.datum).toBe(data[1])
  })
})
