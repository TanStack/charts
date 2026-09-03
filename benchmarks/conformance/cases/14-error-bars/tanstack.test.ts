import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@tanstack/charts-data/penguins'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'
import { createChartRuntime } from '@tanstack/charts'
import type { ChartSpecDatum } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createExampleChart, sampleDeviation } from './tanstack'
import type { ConformanceInput } from '../../types'

type PenguinWithMass = PenguinsRow & { body_mass_g: number }
type ErrorBarDatum = ChartSpecDatum<ReturnType<typeof createExampleChart>>

const expected = [
  {
    species: 'Adelie',
    mean: 3700.662251655629,
    deviation: 458.56612591013476,
  },
  {
    species: 'Chinstrap',
    mean: 3733.0882352941176,
    deviation: 384.3350813871914,
  },
  {
    species: 'Gentoo',
    mean: 5076.016260162602,
    deviation: 504.1162366570917,
  },
] as const

describe('definition-owned error bars', () => {
  it('groups source observations once and composes native interval marks', () => {
    const scene = render(0)
    const means = scene.points.filter(({ markId }) => markId === 'error-mean')

    expectTypeOf<ErrorBarDatum['species']>().toEqualTypeOf<string>()
    expectTypeOf<ErrorBarDatum['mean']>().toEqualTypeOf<number>()
    expectTypeOf<ErrorBarDatum['deviation']>().toEqualTypeOf<number>()
    expectTypeOf<
      ErrorBarDatum['source'][number]
    >().toEqualTypeOf<PenguinWithMass>()
    expect(means).toHaveLength(3)
    expect(scene.points).toHaveLength(12)

    means.forEach((point, index) => {
      const datum = point.datum
      const estimate = expected[index]!
      const low = datum.mean - datum.deviation
      const high = datum.mean + datum.deviation
      const interval = scene.points.find(
        (candidate) =>
          candidate.markId === 'error-interval' && candidate.datum === datum,
      )
      const lowCap = scene.points.find(
        (candidate) =>
          candidate.markId === 'error-low' && candidate.datum === datum,
      )
      const highCap = scene.points.find(
        (candidate) =>
          candidate.markId === 'error-high' && candidate.datum === datum,
      )

      expect(datum.species).toBe(estimate.species)
      expect(datum.mean).toBeCloseTo(estimate.mean)
      expect(datum.deviation).toBeCloseTo(estimate.deviation)
      expect(point.yValue).toBeCloseTo(datum.mean)
      expect(interval?.y1Value).toBeCloseTo(low)
      expect(interval?.y2Value).toBeCloseTo(high)
      expect(lowCap?.yValue).toBeCloseTo(low)
      expect(highCap?.yValue).toBeCloseTo(high)
      expect(
        scene.points.filter((candidate) => candidate.datum === datum),
      ).toHaveLength(4)
    })
  })

  it.each([0, 1])(
    'preserves contributing source identity and lineage at revision %i',
    (revision) => {
      const observations = penguins
        .slice(revision * 8)
        .filter((row): row is PenguinWithMass => row.body_mass_g !== null)
      const means = render(revision).points.filter(
        ({ markId }) => markId === 'error-mean',
      )

      for (const { datum } of means) {
        expect(datum.source).toHaveLength(datum.sourceIndexes.length)
        datum.sourceIndexes.forEach((sourceIndex, index) => {
          expect(datum.source[index]).toBe(observations[sourceIndex])
          expect(datum.source[index]?.species).toBe(datum.species)
        })
      }
      expect(means.flatMap(({ datum }) => datum.source)).toHaveLength(
        observations.length,
      )
    },
  )

  it('keeps the authored singleton interval policy explicit', () => {
    expect(
      sampleDeviation({
        values: [42],
        data: [{}],
        indexes: [0],
        group: { species: 'Solo' },
      }),
    ).toBe(0)
    expect(
      sampleDeviation({
        values: [10, 20, 30],
        data: [{}, {}, {}],
        indexes: [0, 1, 2],
        group: { species: 'Group' },
      }),
    ).toBe(10)
  })

  it('keeps grouping in each library definition without a shared summary DTO', () => {
    const caseDirectory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/14-error-bars',
    )
    const tanstackSource = readFileSync(
      resolve(caseDirectory, 'example.tsx'),
      'utf8',
    )
    const plotSource = readFileSync(resolve(caseDirectory, 'plot.ts'), 'utf8')

    expect(tanstackSource).toContain('groupBy(observations')
    expect(tanstackSource).toContain('reduce: sampleDeviation')
    expect(tanstackSource).toContain('mean - spread')
    expect(tanstackSource).toContain('mean + spread')
    expect(tanstackSource).not.toContain("from './transform'")
    expect(tanstackSource).not.toContain('new Map')
    expect(plotSource).toContain('Plot.groupX(')
    expect(plotSource).not.toContain("from './transform'")
    expect(existsSync(resolve(caseDirectory, 'transform.ts'))).toBe(false)
  })
})

function render(revision: number) {
  const input: ConformanceInput = {
    width: 640,
    height: 400,
    revision,
    interactive: true,
  }
  return createChartRuntime<ErrorBarDatum, string, number>().render(
    createExampleChart(input),
    input,
  )
}
