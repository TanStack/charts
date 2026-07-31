import {
  scaleBand as d3ScaleBand,
  scaleOrdinal as d3ScaleOrdinal,
  scalePoint as d3ScalePoint,
} from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, type BandScale } from './band'
import { scaleOrdinal, type OrdinalScale } from './ordinal'
import { scalePoint, type PointScale } from './point'

const domain = ['Alpha', 'Beta', 'Gamma'] as const

describe('compact categorical scales', () => {
  it.each([
    {
      range: [0, 300],
      paddingInner: 0,
      paddingOuter: 0,
      align: 0.5,
      round: false,
    },
    {
      range: [300, 0],
      paddingInner: 0.2,
      paddingOuter: 0.35,
      align: 0,
      round: false,
    },
    {
      range: [3, 247],
      paddingInner: 0.1,
      paddingOuter: 0.2,
      align: 1,
      round: true,
    },
  ])('matches D3 band geometry for $range', (options) => {
    const compact = scaleBand<string>()
      .domain(domain)
      .range(options.range)
      .paddingInner(options.paddingInner)
      .paddingOuter(options.paddingOuter)
      .align(options.align)
      .round(options.round)
    const d3 = d3ScaleBand<string>()
      .domain(domain)
      .range(options.range)
      .paddingInner(options.paddingInner)
      .paddingOuter(options.paddingOuter)
      .align(options.align)
      .round(options.round)

    expect(domain.map(compact)).toEqual(domain.map(d3))
    expect(compact.step()).toBe(d3.step())
    expect(compact.bandwidth()).toBe(d3.bandwidth())
  })

  it.each([
    { range: [0, 300], padding: 0, align: 0.5, round: false },
    { range: [300, 0], padding: 0.4, align: 0, round: false },
    { range: [3, 247], padding: 1, align: 1, round: true },
  ])('matches D3 point geometry for $range', (options) => {
    const compact = scalePoint<string>()
      .domain(domain)
      .range(options.range)
      .padding(options.padding)
      .align(options.align)
      .round(options.round)
    const d3 = d3ScalePoint<string>()
      .domain(domain)
      .range(options.range)
      .padding(options.padding)
      .align(options.align)
      .round(options.round)

    expect(domain.map(compact)).toEqual(domain.map(d3))
    expect(compact.step()).toBe(d3.step())
    expect(compact.bandwidth()).toBe(0)
  })

  it('interns duplicate primitives and equal Date timestamps', () => {
    const first = new Date('2026-01-01T00:00:00Z')
    const second = new Date(first)
    const band = scaleBand<string>().domain(['1', '1', '2'])
    const dates = scalePoint<Date>().domain([first, second])

    expect(band.domain()).toEqual(['1', '2'])
    expect(dates.domain()).toEqual([first])
    expect(dates(second)).toBe(dates(first))
  })

  it('copies band and point policy without sharing domains', () => {
    const band = scaleBand<string>()
      .domain(domain)
      .rangeRound([0, 101])
      .padding(0.2)
      .align(0)
    const point = scalePoint<string>()
      .domain(domain)
      .range([10, 90])
      .padding(0.3)
      .align(1)
    const bandCopy = band.copy()
    const pointCopy = point.copy()

    expect(domain.map(bandCopy)).toEqual(domain.map(band))
    expect(domain.map(pointCopy)).toEqual(domain.map(point))
    bandCopy.domain(['Delta'])
    pointCopy.domain(['Delta'])
    expect(band.domain()).toEqual(domain)
    expect(point.domain()).toEqual(domain)
  })

  it('matches D3 ordinal domain growth, cycling, unknowns, and copies', () => {
    const compact = scaleOrdinal<string, string>().range(['red', 'blue'])
    const d3 = d3ScaleOrdinal<string, string>().range(['red', 'blue'])

    for (const value of ['Alpha', 'Beta', 'Gamma', 'Alpha']) {
      expect(compact(value)).toBe(d3(value))
    }
    expect(compact.domain()).toEqual(d3.domain())

    compact.unknown('missing')
    expect(compact('Delta')).toBe('missing')
    const copy = compact.copy()
    expect(copy('Other')).toBe('missing')
    copy.domain(['Only'])
    expect(compact.domain()).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('exposes precise callable contracts', () => {
    const band: BandScale<string> = scaleBand<string>()
    const point: PointScale<number> = scalePoint<number>()
    const ordinal: OrdinalScale<string, number> = scaleOrdinal<string, number>()
    expectTypeOf(band('x')).toEqualTypeOf<number | undefined>()
    expectTypeOf(point(1)).toEqualTypeOf<number | undefined>()
    expectTypeOf(ordinal('x')).toEqualTypeOf<number>()
  })
})
