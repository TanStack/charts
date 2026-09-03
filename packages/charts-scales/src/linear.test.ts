import { scaleLinear as d3ScaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleLinear, type LinearScale } from './linear'

describe('compact linear scale', () => {
  it.each([
    { domain: [0, 10], range: [0, 100] },
    { domain: [10, 0], range: [0, 100] },
    { domain: [0, 10], range: [100, 0] },
    { domain: [-0.000_4, 0.000_9], range: [-20, 40] },
    { domain: [5, 5], range: [0, 100] },
  ])('matches D3 numeric mapping for $domain', ({ domain, range }) => {
    const compact = scaleLinear(domain, range)
    const d3 = d3ScaleLinear(domain, range)

    for (const value of [-20, -1, 0, 2.5, 5, 10, 30]) {
      expect(compact(value)).toBeCloseTo(d3(value), 12)
      expect(compact.clamp(true)(value)).toBeCloseTo(d3.clamp(true)(value), 12)
    }
  })

  it.each([
    [-1.2, 8.7, 5],
    [8.7, -1.2, 5],
    [0.000_12, 0.000_89, 6],
    [-9e12, 4e12, 8],
  ] as const)(
    'matches D3 ticks and nicening for %s..%s',
    (start, stop, count) => {
      const compact = scaleLinear().domain([start, stop])
      const d3 = d3ScaleLinear().domain([start, stop])

      expect(compact.ticks(count)).toEqual(d3.ticks(count))
      expect(compact.nice(count).domain()).toEqual(d3.nice(count).domain())
    },
  )

  it('copies domain, range, and clamp without sharing mutation', () => {
    const source = scaleLinear([-2, 8], [10, 90]).clamp(true)
    const copy = source.copy()

    expect(copy.domain()).toEqual(source.domain())
    expect(copy.range()).toEqual(source.range())
    expect(copy.clamp()).toBe(true)
    copy.domain([0, 1]).range([0, 10]).clamp(false)
    expect(source.domain()).toEqual([-2, 8])
    expect(source.range()).toEqual([10, 90])
    expect(source.clamp()).toBe(true)
  })

  it('inverts, formats fractional ticks, and rejects invalid pairs', () => {
    const scale = scaleLinear([0, 1], [10, 30])

    expect(scale.invert(20)).toBe(0.5)
    expect(scale.tickFormat(5)(0.2)).toBe('0.2')
    expect(scale(null)).toBeUndefined()
    expect(scale(Number.NaN)).toBeUndefined()
    expect(() => scale.domain([1])).toThrow(
      'requires exactly two finite numbers',
    )
    expect(() => scale.domain([0, 0.5, 1])).toThrow(
      'requires exactly two finite numbers',
    )
    expect(() => scale.range([0, Number.NaN])).toThrow(
      'requires exactly two finite numbers',
    )
    expect(() => scale.range([0, 50, 100])).toThrow(
      'requires exactly two finite numbers',
    )
  })

  it('has the callable, copyable Charts scale contract', () => {
    const scale: LinearScale = scaleLinear()
    expectTypeOf(scale(2)).toEqualTypeOf<number | undefined>()
    expectTypeOf(scale.copy()).toEqualTypeOf<LinearScale>()
  })
})
