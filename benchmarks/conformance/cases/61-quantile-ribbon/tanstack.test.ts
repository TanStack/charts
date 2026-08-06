import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { industries } from '@charts-poc/demo-data/industries'
import { createChartRuntime, groupBy, quantile } from '@tanstack/charts'
import { quantile as d3Quantile } from 'd3-array'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { quantileRibbonDefinition, quantileRows } from './tanstack'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ChartSpecDatum } from '@tanstack/charts'

type QuantileDatum = ChartSpecDatum<ReturnType<typeof quantileRibbonDefinition>>

describe('definition-owned quantile ribbon', () => {
  it('groups public quantile reducers with exact source lineage', () => {
    const groups = groupIndustriesByDate()

    expectTypeOf<QuantileDatum['date']>().toEqualTypeOf<Date>()
    expectTypeOf<QuantileDatum['lower']>().toEqualTypeOf<number>()
    expectTypeOf<QuantileDatum['median']>().toEqualTypeOf<number>()
    expectTypeOf<QuantileDatum['upper']>().toEqualTypeOf<number>()
    expectTypeOf<
      QuantileDatum['source'][number]
    >().toEqualTypeOf<IndustriesRow>()
    expect(quantileRows).toHaveLength(122)
    expect(quantileRows).toHaveLength(groups.size)
    expect(quantileRows.map(({ date }) => date.getTime())).toEqual([
      ...groups.keys(),
    ])

    quantileRows.forEach((row) => {
      const group = groups.get(row.date.getTime())!
      const indexes = group.map(({ index }) => index)
      const source = group.map(({ row }) => row)

      expect(row.date).toBe(source[0]!.date)
      expect(row.sourceIndexes).toEqual(indexes)
      expect(row.source).toEqual(source)
      expect(row.source).toHaveLength(14)
      expect(row.lower).toBeLessThanOrEqual(row.median)
      expect(row.median).toBeLessThanOrEqual(row.upper)
      row.source.forEach((datum, index) => {
        expect(datum).toBe(industries[indexes[index]!])
      })
      expect(row.lower).toBeCloseTo(
        d3Quantile(source, 0.1, ({ unemployed }) => unemployed)!,
      )
      expect(row.median).toBeCloseTo(
        d3Quantile(source, 0.5, ({ unemployed }) => unemployed)!,
      )
      expect(row.upper).toBeCloseTo(
        d3Quantile(source, 0.9, ({ unemployed }) => unemployed)!,
      )
    })
    expect(
      quantileRows
        .flatMap(({ sourceIndexes }) => sourceIndexes)
        .sort((left, right) => left - right),
    ).toEqual(industries.map((_row, index) => index))
  })

  it('keeps empty and nonfinite groups numeric without case-owned guards', () => {
    const outputs = {
      value: { value: 'value' as const, reduce: quantile(0.5) },
    }
    const invalid = [{ date: new Date('2024-01-01T00:00:00Z'), value: NaN }]

    expect(groupBy([], { by: 'date', outputs })).toEqual([])
    const [summary] = groupBy(invalid, { by: 'date', outputs })
    expect(summary?.source[0]).toBe(invalid[0])
    expect(summary?.value).toBeNaN()
  })

  it('feeds the same aggregate rows to the ribbon and median line', () => {
    const scene = createChartRuntime<QuantileDatum>().render(
      quantileRibbonDefinition(),
      { width: 640, height: 400 },
    )
    const ribbon = scene.points.filter(
      ({ markId }) => markId === 'quantile-ribbon',
    )
    const median = scene.points.filter(({ markId }) => markId === 'median-line')

    expect(ribbon).toHaveLength(quantileRows.length)
    expect(median).toHaveLength(quantileRows.length)
    quantileRows.forEach((row, index) => {
      expect(ribbon[index]!.datum).toBe(row)
      expect(median[index]!.datum).toBe(row)
      expect(ribbon[index]!.key).toContain(String(row.date.getTime()))
      expect(median[index]!.key).toContain(String(row.date.getTime()))
    })
  })

  it('keeps the grouped reducers directly beside the marks', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/61-quantile-ribbon/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('groupBy(industries')
    expect(source).toContain("by: 'date'")
    expect(source).toContain('quantile(0.1)')
    expect(source).toContain('quantile(0.5)')
    expect(source).toContain('quantile(0.9)')
    expect(source).toContain('areaY(quantileRows')
    expect(source).toContain('lineY(quantileRows')
    expect(source).not.toContain('summarizeQuantiles')
    expect(source).not.toContain('QuantileSummary')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('flatMap(')
    expect(source).not.toContain('new Date(')
  })
})

function groupIndustriesByDate() {
  const groups = new Map<
    number,
    { readonly row: IndustriesRow; readonly index: number }[]
  >()
  industries.forEach((row, index) => {
    const key = row.date.getTime()
    const group = groups.get(key) ?? []
    group.push({ row, index })
    groups.set(key, group)
  })
  return groups
}
