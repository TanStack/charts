import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { describe, expect, it } from 'vitest'
import { decathlonEvents, timedEvents } from './selection'
import {
  foldedDecathlon,
  normalizedDecathlon,
  parallelCoordinatesDefinition,
  representativeProfiles,
} from './tanstack'

describe('folded parallel coordinates', () => {
  it('folds in source-major metric order and normalizes the full population', () => {
    expect(foldedDecathlon).toHaveLength(decathlon.length * 4)
    expect(foldedDecathlon.slice(0, 4).map(({ event }) => event)).toEqual(
      decathlonEvents,
    )
    expect(
      foldedDecathlon
        .slice(0, 4)
        .every(({ source }) => source[0] === decathlon[0]),
    ).toBe(true)

    for (const event of decathlonEvents) {
      const rows = normalizedDecathlon.filter((row) => row.event === event)
      const minimum = rows.reduce((left, right) =>
        left.result < right.result ? left : right,
      )
      const maximum = rows.reduce((left, right) =>
        left.result > right.result ? left : right,
      )

      expect(rows).toHaveLength(decathlon.length)
      expect(minimum.relativePerformance).toBe(timedEvents.has(event) ? 1 : 0)
      expect(maximum.relativePerformance).toBe(timedEvents.has(event) ? 0 : 1)
    }
  })

  it('retains the last source row for each country and event', () => {
    const countries = [...new Set(decathlon.map((row) => row.Country))]
    const lastByCountry = new Map(
      decathlon.map((row) => [row.Country, row] as const),
    )

    expect(representativeProfiles).toHaveLength(countries.length * 4)
    for (const point of representativeProfiles) {
      const folded = point.source[0]
      expect(folded?.source[0]).toBe(lastByCountry.get(point.Country))
      expect(point.result).toBe(lastByCountry.get(point.Country)?.[point.event])
    }
  })

  it('renders seven stable four-point native profiles', () => {
    const first = render()
    const repeated = render()
    const lines = first.points.filter(
      ({ markId }) => markId === 'country-lines',
    )
    const dots = first.points.filter(
      ({ markId }) => markId === 'country-points',
    )

    expect(lines).toHaveLength(28)
    expect(dots).toHaveLength(28)
    expect(new Set(lines.map(({ group }) => group))).toEqual(
      new Set(decathlon.map(({ Country }) => Country)),
    )
    expect(
      lines.every(({ yValue }) => Number(yValue) >= 0 && Number(yValue) <= 100),
    ).toBe(true)
    expect(repeated.points.map(({ key }) => key)).toEqual(
      first.points.map(({ key }) => key),
    )
  })

  it('keeps structural transforms in the TanStack definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/27-parallel-coordinates/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/transform/fold'")
    expect(source).toContain('normalize(foldedDecathlon')
    expect(source).toContain('select(normalizedDecathlon')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('extent(')
  })
})

function render() {
  return createChartRuntime().render(parallelCoordinatesDefinition(), {
    width: 640,
    height: 400,
  })
}
