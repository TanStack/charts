import { scaleUtc as d3ScaleUtc } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleUtc, type UtcScale } from './time'

describe('compact UTC scale', () => {
  it('does not nice weekly boundaries beyond the valid Date range', () => {
    for (const domain of [
      [-8.64e15, -8.64e15 + 7 * 86_400_000],
      [8.64e15 - 7 * 86_400_000, 8.64e15],
    ]) {
      const scale = scaleUtc(domain, [0, 1])
      expect(scale.nice(1).domain().map(Number)).toEqual(domain)
      expect(scale.copy().domain().map(Number)).toEqual(domain)
    }
  })
  it('keeps calendar ticks finite at the Date boundaries', () => {
    for (const span of [7, 90, 800].map((days) => days * 86_400_000)) {
      for (const domain of [
        [-8.64e15, -8.64e15 + span],
        [8.64e15 - span, 8.64e15],
      ]) {
        const scale = scaleUtc(domain, [0, 1])
        const ticks = scale.ticks(3).map(Number)
        expect(ticks.length).toBeGreaterThan(0)
        expect(
          ticks.every(
            (value) =>
              Number.isFinite(value) &&
              value >= domain[0]! &&
              value <= domain[1]!,
          ),
        ).toBe(true)
        expect(
          scale
            .nice(3)
            .domain()
            .every((value) => Number.isFinite(+value)),
        ).toBe(true)
      }
    }
  })
  const spans = [
    1, 125, 10_000, 90_000, 3_600_000, 20_000_000, 172_800_000, 2_000_000_000,
    8_000_000_000, 40_000_000_000, 1e12,
  ]
  for (const start of [
    -2_208_988_800_000,
    -100_001,
    0,
    Date.UTC(2024, 1, 27, 3, 12),
  ]) {
    for (const span of spans) {
      it(`matches UTC calendar ticks and nice for ${start} + ${span}`, () => {
        for (const count of [1, 2, 5, 10, 20])
          for (const domain of [
            [start, start + span],
            [start + span, start],
          ]) {
            const actual = scaleUtc(domain, [0, 100])
            const expected = d3ScaleUtc(domain, [0, 100])
            expect(actual.ticks(count)).toEqual(expected.ticks(count))
            const nice = d3ScaleUtc([start, start + span], [0, 100])
              .nice(count)
              .domain()
            expect(actual.nice(count).domain()).toEqual(
              domain[0]! > domain[1]! ? nice.reverse() : nice,
            )
          }
      })
    }
  }

  it('maps and inverts dates, reversed domains and clamped ranges', () => {
    for (const domain of [
      [0, 1000],
      [1000, 0],
      [100, 100],
    ]) {
      const actual = scaleUtc(domain, [20, 80])
      const expected = d3ScaleUtc(domain, [20, 80])
      for (const clamped of [false, true]) {
        actual.clamp(clamped)
        expected.clamp(clamped)
        for (const value of [-1000, -0.5, 0, 0.5, 123, 500, 1000, 2000]) {
          expect(actual(new Date(value))).toBeCloseTo(
            expected(new Date(value)),
            12,
          )
          expect(actual(value)).toBeCloseTo(expected(new Date(value)), 12)
          // Date truncation can expose a one-millisecond floating-point difference.
          expect(
            Math.abs(+actual.invert(value) - +expected.invert(value)),
          ).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('owns its dates and copies all configuration', () => {
    const start = new Date(0),
      stop = new Date(1000)
    const source = scaleUtc([start, stop], [10, 90]).clamp(true)
    start.setTime(500)
    source.domain()[0].setTime(700)
    const copy = source.copy().domain([100, 200]).range([0, 1]).clamp(false)
    expect(source.domain().map(Number)).toEqual([0, 1000])
    expect(source.range()).toEqual([10, 90])
    expect(source.clamp()).toBe(true)
    expect(copy.domain().map(Number)).toEqual([100, 200])
    expectTypeOf(copy).toEqualTypeOf<UtcScale>()
    expectTypeOf(copy.invert(0)).toEqualTypeOf<Date>()
    expect(scaleUtc([20, 40]).range()).toEqual([20, 40])
    expect(scaleUtc().domain()).toEqual(d3ScaleUtc().domain())
  })

  it('rejects malformed domains and preserves prior state on failure', () => {
    const scale = scaleUtc()
    for (const values of [
      [],
      [0],
      [0, 1, 2],
      [0, NaN],
      [0, Infinity],
      [0, 8.64e15 + 1],
      [new Date(NaN), new Date()],
    ]) {
      expect(() => scale.domain(values)).toThrow('exactly two valid dates')
      expect(scale.domain()).toEqual(d3ScaleUtc().domain())
    }
    expect(() => scale.range([0])).toThrow()
    for (const value of [null, undefined, NaN, new Date(NaN), 8.64e15 + 1])
      expect(scale(value)).toBeUndefined()
    for (const count of [0, -1, NaN, Infinity]) {
      expect(scale.ticks(count)).toEqual([])
      expect(scale.nice(count)).toBe(scale)
    }
    expect(scaleUtc([0, 0], [0, 1]).ticks()).toEqual([new Date(0)])
  })

  it('formats UTC ticks independently of the local timezone', () => {
    const format = scaleUtc().tickFormat()
    const expected = d3ScaleUtc().tickFormat()
    for (const iso of [
      '2024-01-01',
      '2024-02-01',
      '2024-02-04',
      '2024-02-05',
      '2024-02-29',
      '2024-01-01T13:00:00Z',
      '2024-01-01T00:05:00Z',
      '2024-01-01T12:34:56.123Z',
      '2024-01-01T12:34:56Z',
      '0001-01-01',
      '-000001-01-01',
    ]) {
      expect(format(new Date(iso))).toBe(expected(new Date(iso)))
    }
  })
})
