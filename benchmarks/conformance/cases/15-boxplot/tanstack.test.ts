import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { morley } from '@charts-poc/demo-data/morley'
import type { MorleyRow } from '@charts-poc/demo-data/morley'
import { createChartRuntime } from '@tanstack/charts'
import type { BoxDatum, ChartSpecDatum } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { boxplotDefinition } from './tanstack'

type Datum = ChartSpecDatum<ReturnType<typeof boxplotDefinition>>

describe('native boxplot definition', () => {
  it('derives Tukey summaries and raw-linked outliers inside boxY', () => {
    const scene = createChartRuntime<Datum, number, number>().render(
      boxplotDefinition(),
      { width: 640, height: 400 },
    )
    const summaries = scene.points.flatMap(({ datum }) =>
      datum.kind === 'summary' ? [datum] : [],
    )
    const outliers = scene.points.flatMap(({ datum }) =>
      datum.kind === 'outlier' ? [datum] : [],
    )

    expectTypeOf<Datum>().toEqualTypeOf<BoxDatum<MorleyRow, number>>()
    expect(scene.points).toHaveLength(11)
    expect(
      summaries.map((datum) => [
        datum.category,
        datum.q1,
        datum.median,
        datum.q3,
        datum.whiskerLow,
        datum.whiskerHigh,
      ]),
    ).toEqual([
      [1, 850, 940, 980, 740, 1070],
      [2, 800, 845, 885, 760, 960],
      [3, 840, 855, 880, 840, 910],
      [4, 767.5, 815, 865, 720, 920],
      [5, 807.5, 810, 870, 740, 950],
    ])
    expect(outliers.map(({ category, value }) => [category, value])).toEqual([
      [1, 650],
      [3, 720],
      [3, 720],
      [3, 620],
      [3, 970],
      [3, 950],
    ])
    outliers.forEach((datum) => {
      expect(datum.source[0]).toBe(morley[datum.sourceIndexes[0]])
    })
  })

  it('keeps statistical preparation behind the native mark boundary', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/15-boxplot/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('boxY(morley')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('summarizeBoxplots')
    expect(source).not.toContain('quantileSorted')
    expect(source).not.toContain('link(summaries')
  })
})
