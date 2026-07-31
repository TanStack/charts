import { describe, expect, it } from 'vitest'
import { assertKnownFilterValues, parseShard, selectShard } from './filters.mjs'

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
})
