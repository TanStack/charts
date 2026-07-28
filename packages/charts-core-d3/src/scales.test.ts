import { describe, expect, it } from 'vitest'
import { createScale, formatNumber } from './scales'
import { scaleLog, scaleSqrt, scaleSymlog } from './scale-transforms'
import { scaleUtc } from './time-scale'

describe('scale families', () => {
  it('maps logarithmic decades evenly', () => {
    const scale = createScale(
      'x',
      [1, 10, 100, 1_000],
      [0, 300],
      { type: scaleLog() },
      5,
    )

    expect(scale.map(1)).toBeCloseTo(0)
    expect(scale.map(10)).toBeCloseTo(100)
    expect(scale.map(100)).toBeCloseTo(200)
    expect(scale.map(1_000)).toBeCloseTo(300)
    expect(scale.ticks.map((tick) => tick.value)).toEqual([1, 10, 100, 1_000])
  })

  it('supports signed symlog and sqrt scales', () => {
    const symlog = createScale(
      'x',
      [-100, 0, 100],
      [0, 200],
      { type: scaleSymlog() },
      5,
    )
    const sqrt = createScale(
      'x',
      [-100, 0, 100],
      [0, 200],
      { type: scaleSqrt() },
      5,
    )

    expect(symlog.map(0)).toBeCloseTo(100)
    expect(sqrt.map(0)).toBeCloseTo(100)
    expect(sqrt.map(25)).toBeCloseTo(150)
  })

  it('can reverse and clamp output', () => {
    const scale = createScale(
      'x',
      [0, 10],
      [0, 100],
      { reverse: true, clamp: true, nice: false },
      5,
    )

    expect(scale.map(0)).toBe(100)
    expect(scale.map(10)).toBe(0)
    expect(scale.map(20)).toBe(0)
  })

  it('rejects a non-positive log domain', () => {
    expect(() =>
      createScale(
        'x',
        [-1, 10],
        [0, 100],
        { type: scaleLog(), domain: [-1, 10] },
        5,
      ),
    ).toThrow(/strictly positive/)
  })

  it('uses calendar boundaries for UTC month ticks', () => {
    const scale = createScale(
      'x',
      [new Date('2026-01-15T00:00:00Z'), new Date('2026-06-15T00:00:00Z')],
      [0, 500],
      { type: scaleUtc() },
      5,
    )
    const ticks = scale.ticks.map((tick) => tick.value)

    expect(ticks.every((tick) => tick instanceof Date)).toBe(true)
    expect(
      ticks.map((tick) => (tick as Date).toISOString().slice(0, 10)),
    ).toEqual([
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ])
  })

  it('uses readable D3 formatting without SI prefixes below one thousand', () => {
    expect(formatNumber(0.2)).toBe('0.2')
    expect(formatNumber(1_250)).toBe('1.25k')
    expect(formatNumber(1_000_000_000)).toBe('1B')
  })
})
