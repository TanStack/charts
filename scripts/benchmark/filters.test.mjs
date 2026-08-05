import { describe, expect, it } from 'vitest'
import {
  assertKnownFilterValues,
  parseShard,
  selectShard,
  selectWeightedShard,
} from './filters.mjs'

describe('assertKnownFilterValues', () => {
  it('accepts an absent or completely known filter', () => {
    expect(() =>
      assertKnownFilterValues(undefined, ['a', 'b'], 'case'),
    ).not.toThrow()
    expect(() =>
      assertKnownFilterValues(new Set(['b', 'a']), ['a', 'b'], 'case'),
    ).not.toThrow()
  })

  it('rejects every unknown value even when another value is valid', () => {
    expect(() =>
      assertKnownFilterValues(
        new Set(['known', 'missing-z', 'missing-a']),
        ['known', 'other'],
        'workload',
      ),
    ).toThrow(
      'Unknown workload filter values: missing-a, missing-z. Available: known, other.',
    )
  })
})

describe('benchmark shards', () => {
  it('parses one-based shards and partitions ordered values exactly once', () => {
    expect(parseShard('2/3')).toEqual({ index: 2, total: 3 })
    const values = Array.from({ length: 10 }, (_, index) => index)
    const shards = [1, 2, 3].map((index) =>
      selectShard(values, { index, total: 3 }),
    )
    expect(shards).toEqual([
      [0, 3, 6, 9],
      [1, 4, 7],
      [2, 5, 8],
    ])
    expect(shards.flat().sort((left, right) => left - right)).toEqual(values)
  })

  it.each(['0/3', '4/3', '1/0', 'one/two', '1'])(
    'rejects invalid shard %s',
    (value) => {
      expect(() => parseShard(value)).toThrow(/Invalid shard/)
    },
  )

  it('balances weighted values deterministically and preserves source order', () => {
    const values = [
      { id: 'a', weight: 9 },
      { id: 'b', weight: 8 },
      { id: 'c', weight: 7 },
      { id: 'd', weight: 6 },
      { id: 'e', weight: 5 },
      { id: 'f', weight: 4 },
    ]
    const shards = [1, 2, 3].map((index) =>
      selectWeightedShard(values, { index, total: 3 }, (value) => value.weight),
    )

    expect(shards.map((entries) => entries.map((entry) => entry.id))).toEqual([
      ['a', 'f'],
      ['b', 'e'],
      ['c', 'd'],
    ])
    expect(
      shards.map((entries) =>
        entries.reduce((total, entry) => total + entry.weight, 0),
      ),
    ).toEqual([13, 13, 13])
    expect(shards.flat()).toEqual(expect.arrayContaining(values))
  })

  it('does not allocate empty weighted shards for a huge shard total', () => {
    const values = ['a', 'b']
    const total = Number.MAX_SAFE_INTEGER

    expect(selectWeightedShard(values, { index: 1, total }, () => 1)).toEqual([
      'a',
    ])
    expect(
      selectWeightedShard(values, { index: total, total }, () => 1),
    ).toEqual([])
  })

  it('rejects invalid weights before assigning a partial shard', () => {
    expect(() =>
      selectWeightedShard([1, 2], { index: 1, total: 2 }, (value) =>
        value === 2 ? Number.NaN : value,
      ),
    ).toThrow('Shard weight at index 1')
  })
})
