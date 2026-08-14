import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { createChartRuntime } from '@tanstack/charts'
import type { ChartSpecDatum } from '@tanstack/charts'
import { deviation, mean } from 'd3-array'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { ConformanceInput } from '../../types'
import { selectBollingerData } from './selection'
import { bollingerDefinition } from './tanstack'

type BollingerDatum = ChartSpecDatum<ReturnType<typeof bollingerDefinition>>

describe('definition-owned Bollinger band', () => {
  it.each([0, 1])(
    'derives one full trailing window per rendered date at revision %i',
    (revision) => {
      const selected = selectBollingerData(aapl, revision)
      const scene = render(revision)
      const bands = scene.points.filter(
        ({ markId }) => markId === 'bollinger-band',
      )
      const means = scene.points.filter(
        ({ markId }) => markId === 'bollinger-mean',
      )

      expectTypeOf<BollingerDatum['Date']>().toEqualTypeOf<Date>()
      expectTypeOf<BollingerDatum['meanClose']>().toEqualTypeOf<number>()
      expectTypeOf<BollingerDatum['closeDeviation']>().toEqualTypeOf<number>()
      expectTypeOf<BollingerDatum['source'][number]>().toEqualTypeOf<AaplRow>()
      expect(bands).toHaveLength(selected.length - 19)
      expect(means).toHaveLength(bands.length)
      expect(scene.points).toHaveLength(bands.length * 2)

      bands.forEach((point, index) => {
        const datum = point.datum
        const sourceIndexes = Array.from(
          { length: 20 },
          (_, offset) => index + offset,
        )
        const source = sourceIndexes.map(
          (sourceIndex) => selected[sourceIndex]!,
        )
        const closes = source.map(({ Close }) => Close)
        const expectedMean = mean(closes)!
        const expectedDeviation = deviation(closes)!
        const meanPoint = means[index]!

        expect(datum.Date).toBe(selected[index + 19]!.Date)
        expect(datum.sourceIndexes).toEqual(sourceIndexes)
        expect(datum.source).toEqual(source)
        datum.source.forEach((row, sourceIndex) => {
          expect(row).toBe(source[sourceIndex])
        })
        expect(datum.meanClose).toBeCloseTo(expectedMean)
        expect(datum.closeDeviation).toBeCloseTo(expectedDeviation)
        expect(point.y1Value).toBeCloseTo(expectedMean - expectedDeviation * 2)
        expect(point.y2Value).toBeCloseTo(expectedMean + expectedDeviation * 2)
        expect(meanPoint.datum).toBe(datum)
        expect(meanPoint.yValue).toBeCloseTo(expectedMean)
      })
    },
  )

  it('keeps the transform and band arithmetic beside the marks', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/22-bollinger-band/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('const rows = rollingWindow(')
    expect(source).toContain("anchor: 'end'")
    expect(source).toContain("meanClose: { value: 'Close', reduce: 'mean' }")
    expect(source).toContain(
      "closeDeviation: { value: 'Close', reduce: deviation }",
    )
    expect(source).toContain(
      'row.meanClose - row.closeDeviation * deviationMultiplier',
    )
    expect(source).toContain(
      'row.meanClose + row.closeDeviation * deviationMultiplier',
    )
    expect(source).not.toContain('bollingerIntervals')
    expect(source).not.toContain('BollingerPoint')
    expect(source).not.toContain('lowerClose')
    expect(source).not.toContain('upperClose')
    expect(source).not.toContain('.map(')
    expect(source).not.toContain("from 'd3-array'")
  })
})

function render(revision: number) {
  const input = {
    width: 640,
    height: 400,
    revision,
  } satisfies ConformanceInput
  return createChartRuntime<BollingerDatum, Date, number>().render(
    bollingerDefinition(input),
    input,
  )
}
