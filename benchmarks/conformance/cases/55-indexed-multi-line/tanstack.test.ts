import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  indexedIndustryDefinition,
  indexedIndustryObservations,
} from './tanstack'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ChartPoint, ChartSpecDatum } from '@tanstack/charts'

type IndexedDatum = ChartSpecDatum<ReturnType<typeof indexedIndustryDefinition>>

describe('definition-owned indexed industry lines', () => {
  it('normalizes within each industry and preserves one-row lineage', () => {
    const scene = render(indexedIndustryObservations)
    const lines = points(scene.points, 'indexed-lines')
    const labels = points(scene.points, 'end-labels')
    const chronological = [...indexedIndustryObservations].sort(
      (left, right) => left.date.getTime() - right.date.getTime(),
    )
    const groups = groupByIndustry(indexedIndustryObservations)

    expectTypeOf<IndexedDatum['indexed']>().toEqualTypeOf<number>()
    expectTypeOf<
      IndexedDatum['source'][number]
    >().toEqualTypeOf<IndustriesRow>()
    expect(lines).toHaveLength(indexedIndustryObservations.length)
    expect(labels).toHaveLength(groups.size)

    for (const point of lines) {
      const datum = point.datum
      const group = groups.get(datum.industry)!
      const baseline = group.reduce((first, row) =>
        row.date < first.date ? row : first,
      )

      expect(point.group).toBe(datum.industry)
      expect(datum.indexed).toBeCloseTo(datum.unemployed / baseline.unemployed)
      expect(datum.source).toHaveLength(1)
      expect(datum.sourceIndexes).toHaveLength(1)
      expect(datum.source[0]).toBe(chronological[datum.sourceIndexes[0]!])
    }

    for (const point of labels) {
      const group = groups.get(point.datum.industry)!
      const latest = group.reduce((last, row) =>
        row.date > last.date ? row : last,
      )

      expect(point.datum.date).toBe(latest.date)
      expect(point.datum.source[0]).toBe(latest)
      expect(lines.some(({ datum }) => datum === point.datum)).toBe(true)
    }
  })

  it('keeps baselines and newest labels stable when input rows are reordered', () => {
    const canonical = render(indexedIndustryObservations)
    const reorderedRows = [...indexedIndustryObservations].reverse()
    const reordered = render(reorderedRows)
    const canonicalValues = new Map(
      points(canonical.points, 'indexed-lines').map(({ datum }) => [
        datumKey(datum),
        datum.indexed,
      ]),
    )

    for (const { datum } of points(reordered.points, 'indexed-lines')) {
      expect(datum.indexed).toBeCloseTo(canonicalValues.get(datumKey(datum))!)
      expect(reorderedRows).toContain(datum.source[0])
    }

    expect(
      points(reordered.points, 'end-labels')
        .map(({ datum }) => [datum.industry, datum.date.getTime()])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    ).toEqual(
      points(canonical.points, 'end-labels')
        .map(({ datum }) => [datum.industry, datum.date.getTime()])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    )
  })

  it('keeps normalization and endpoint selection in the definition source closure', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/55-indexed-multi-line/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('const rows = normalize(')
    expect(source).toContain("by: 'industry'")
    expect(source).toContain("basis: 'first'")
    expect(source).toContain("as: 'indexed'")
    expect(source).toContain('const labels = select(rows')
    expect(source).toContain("select: 'max'")
    expect(source).toContain('datum.date.getTime()')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('indexFromFirst')
    expect(source).not.toContain('lastByIndustry')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
  })
})

function render(source: readonly IndustriesRow[]) {
  return createChartRuntime<IndexedDatum>().render(
    indexedIndustryDefinition(source),
    { width: 640, height: 400 },
  )
}

function points(source: readonly ChartPoint<IndexedDatum>[], markId: string) {
  return source.filter((point) => point.markId === markId)
}

function groupByIndustry(source: readonly IndustriesRow[]) {
  const groups = new Map<string, IndustriesRow[]>()
  for (const row of source) {
    const group = groups.get(row.industry) ?? []
    group.push(row)
    groups.set(row.industry, group)
  }
  return groups
}

function datumKey(datum: IndexedDatum) {
  return `${datum.industry}:${datum.date.getTime()}`
}
