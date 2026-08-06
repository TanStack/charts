import { describe, expect, expectTypeOf, it } from 'vitest'
import { allocateProportionalIntervals } from './proportional-interval-internal'
import type {
  ProportionalInterval,
  ProportionalIntervalOptions,
} from './proportional-interval-internal'

describe('allocateProportionalIntervals', () => {
  it('allocates ordered weights across the default unit extent', () => {
    const intervals = allocateProportionalIntervals([1, 2, 1])

    expectTypeOf(intervals).toEqualTypeOf<ProportionalInterval[]>()
    expect(intervals).toEqual([
      { fraction: 0.25, start: 0, end: 0.25 },
      { fraction: 0.5, start: 0.25, end: 0.75 },
      { fraction: 0.25, start: 0.75, end: 1 },
    ])
  })

  it('keeps zero weights aligned without advancing the cursor', () => {
    expect(allocateProportionalIntervals([0, 1, 0, 3, 0])).toEqual([
      { fraction: 0, start: 0, end: 0 },
      { fraction: 0.25, start: 0, end: 0.25 },
      { fraction: 0, start: 0.25, end: 0.25 },
      { fraction: 0.75, start: 0.25, end: 1 },
      { fraction: 0, start: 1, end: 1 },
    ])
  })

  it('keeps an empty or zero-total allocation at the extent start', () => {
    expect(allocateProportionalIntervals([])).toEqual([])
    expect(
      allocateProportionalIntervals([0, 0], { start: 4, end: 9, gap: 20 }),
    ).toEqual([
      { fraction: 0, start: 4, end: 4 },
      { fraction: 0, start: 4, end: 4 },
    ])
  })

  it('supports internal gaps across forward and reverse extents', () => {
    const forward = allocateProportionalIntervals([1, 3], {
      start: -2,
      end: 2,
      gap: 0.4,
    })
    const reverse = allocateProportionalIntervals([1, 3], {
      start: 2,
      end: -2,
      gap: 0.4,
    })

    expect(forward).toEqual([
      { fraction: 0.25, start: -2, end: -1.1 },
      { fraction: 0.75, start: -0.7000000000000001, end: 2 },
    ])
    expect(reverse).toEqual([
      { fraction: 0.25, start: 2, end: 1.1 },
      { fraction: 0.75, start: 0.7000000000000001, end: -2 },
    ])
  })

  it('can reserve a trailing gap for a cyclic allocation', () => {
    const intervals = allocateProportionalIntervals([2, 0, 1, 0], {
      start: 0,
      end: 10,
      gap: 1,
      gapAfterLast: true,
    })

    expect(intervals[0]).toEqual({
      fraction: 2 / 3,
      start: 0,
      end: 16 / 3,
    })
    expect(intervals[1]).toEqual({
      fraction: 0,
      start: 19 / 3,
      end: 19 / 3,
    })
    expect(intervals[2]).toEqual({
      fraction: 1 / 3,
      start: 19 / 3,
      end: 9,
    })
    expect(intervals[3]).toEqual({ fraction: 0, start: 10, end: 10 })
  })

  it('normalizes totals that overflow without overflowing its intervals', () => {
    const maximum = Number.MAX_VALUE
    const intervals = allocateProportionalIntervals([
      maximum,
      maximum,
      maximum / 2,
    ])

    expect(intervals.map(({ fraction }) => fraction)).toEqual([0.4, 0.4, 0.2])
    expect(intervals).toEqual([
      { fraction: 0.4, start: 0, end: 0.4 },
      { fraction: 0.4, start: 0.4, end: 0.8 },
      { fraction: 0.2, start: 0.8, end: 1 },
    ])
  })

  it('handles the smallest positive finite weights', () => {
    const intervals = allocateProportionalIntervals([
      Number.MIN_VALUE,
      Number.MIN_VALUE,
    ])

    expect(intervals).toEqual([
      { fraction: 0.5, start: 0, end: 0.5 },
      { fraction: 0.5, start: 0.5, end: 1 },
    ])
  })

  it('clamps the final positive interval to the configured endpoint', () => {
    const intervals = allocateProportionalIntervals([1, 1, 1, 0], {
      start: 10,
      end: 11,
    })

    expect(intervals[2]?.end).toBe(11)
    expect(intervals[3]).toEqual({ fraction: 0, start: 11, end: 11 })
  })

  it('does not mutate frozen weights or options', () => {
    const weights = Object.freeze([1, 2])
    const options = Object.freeze({
      start: 2,
      end: 5,
    }) satisfies ProportionalIntervalOptions

    expect(allocateProportionalIntervals(weights, options)).toEqual([
      { fraction: 1 / 3, start: 2, end: 3 },
      { fraction: 2 / 3, start: 3, end: 5 },
    ])
    expect(weights).toEqual([1, 2])
    expect(options).toEqual({ start: 2, end: 5 })
  })

  it('rejects invalid weights and extents', () => {
    expect(() => allocateProportionalIntervals([1, -1])).toThrow(
      'weight at index 1 must be nonnegative and finite',
    )
    expect(() => allocateProportionalIntervals([Number.NaN])).toThrow(
      'weight at index 0 must be nonnegative and finite',
    )
    expect(() =>
      allocateProportionalIntervals([Number.POSITIVE_INFINITY]),
    ).toThrow('weight at index 0 must be nonnegative and finite')
    expect(() =>
      allocateProportionalIntervals([], { start: Number.NaN }),
    ).toThrow('start must be finite')
    expect(() =>
      allocateProportionalIntervals([], { end: Number.NEGATIVE_INFINITY }),
    ).toThrow('end must be finite')
    expect(() =>
      allocateProportionalIntervals([], {
        start: Number.MAX_VALUE,
        end: -Number.MAX_VALUE,
      }),
    ).toThrow('extent span must be finite')
  })

  it('rejects invalid or space-consuming gaps', () => {
    expect(() => allocateProportionalIntervals([1], { gap: -1 })).toThrow(
      'gap must be nonnegative and finite',
    )
    expect(() =>
      allocateProportionalIntervals([1], {
        gap: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('gap must be nonnegative and finite')
    expect(() =>
      allocateProportionalIntervals([1, 1], { end: 1, gap: 2 }),
    ).toThrow('gap leaves insufficient extent')
    expect(() =>
      allocateProportionalIntervals([1, 1], { end: 1, gap: 1 }),
    ).toThrow('positive weights require drawable extent')
    expect(() => allocateProportionalIntervals([1], { end: 0 })).toThrow(
      'positive weights require drawable extent',
    )
    expect(() =>
      allocateProportionalIntervals([1], {
        end: 1,
        gap: 1,
        gapAfterLast: true,
      }),
    ).toThrow('positive weights require drawable extent')
  })
})
