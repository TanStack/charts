import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { completeCars, regressionDefinition } from './tanstack'
import type { ConformanceInput } from '../../types'

type CompleteCar = (typeof completeCars)[number]

interface RegressionDatum {
  readonly source: readonly CompleteCar[]
  readonly sourceIndexes: readonly number[]
}

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned linear regression', () => {
  it('fits the selected raw rows and preserves aggregate source lineage', () => {
    const selected = completeCars.slice(0, 320)
    const scene = render(input)
    const dots = scene.points.filter(({ markId }) => markId === 'dot-0')
    const regression = scene.points.filter(
      ({ markId }) => markId === 'regression:line',
    )

    expect(dots).toHaveLength(320)
    dots.forEach((point, index) => {
      expect(point.datum).toBe(selected[index])
    })
    expect(regression).toHaveLength(64)
    expect(regression[0]?.xValue).toBe(
      Math.min(...selected.map((row) => row['power (hp)'])),
    )
    expect(regression.at(-1)?.xValue).toBe(
      Math.max(...selected.map((row) => row['power (hp)'])),
    )

    const sourceIndexes = selected.map((_row, index) => index)
    regression.forEach(({ datum }) => {
      expect(isRegressionDatum(datum)).toBe(true)
      if (!isRegressionDatum(datum)) return
      expect(datum.sourceIndexes).toEqual(sourceIndexes)
      expect(datum.source).toEqual(selected)
      datum.source.forEach((source, index) => {
        expect(source).toBe(selected[index])
      })
    })
  })

  it('updates the fit from the revised source window', () => {
    const first = render(input).points.filter(
      ({ markId }) => markId === 'regression:line',
    )
    const revised = render({ ...input, revision: 1 }).points.filter(
      ({ markId }) => markId === 'regression:line',
    )
    const revisedRows = completeCars.slice(8, 328)

    expect(first).toHaveLength(64)
    expect(revised).toHaveLength(64)
    expect(revised[0]?.datum).not.toBe(first[0]?.datum)
    const revisedDatum = revised[0]?.datum
    expect(isRegressionDatum(revisedDatum)).toBe(true)
    if (!isRegressionDatum(revisedDatum)) return
    expect(revisedDatum.source[0]).toBe(revisedRows[0])
    expect(revisedDatum.source.at(-1)).toBe(revisedRows.at(-1))
  })

  it('keeps filtering and presentation in the case while core owns the fit', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/31-linear-regression/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('linearRegressionY(rows')
    expect(source).toContain('ci: 0')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('covariance')
    expect(source).not.toContain('variance')
    expect(source).not.toContain('meanX')
    expect(source).not.toContain('lineY(')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(regressionDefinition(nextInput), {
    width: nextInput.width,
    height: nextInput.height,
  })
}

function isRegressionDatum(datum: unknown): datum is RegressionDatum {
  return (
    typeof datum === 'object' &&
    datum !== null &&
    'source' in datum &&
    Array.isArray(datum.source) &&
    'sourceIndexes' in datum &&
    Array.isArray(datum.sourceIndexes)
  )
}
