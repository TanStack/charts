import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cars } from '@tanstack/charts-data/cars'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { selectManyPointData } from './selection'
import { createExampleChart } from './tanstack'
import type { CarsRow } from '@tanstack/charts-data/cars'
import type { ChartPoint, ChartSpecDatum } from '@tanstack/charts'

type CarDatum = ChartSpecDatum<ReturnType<typeof createExampleChart>>

describe('many-point scatter identity', () => {
  it('keeps raw car identity and stable keys across overlapping windows', () => {
    const firstRows = selectManyPointData(cars, 0)
    const secondRows = selectManyPointData(cars, 1)
    const first = pointKeys(0)
    const second = pointKeys(1)
    const overlap = firstRows.filter((row) => second.has(row))

    expectTypeOf<CarDatum>().toEqualTypeOf<CarsRow>()
    expect(
      new Set(firstRows.map(({ name, year }) => `${name}:${year}`)).size,
    ).toBeLessThan(firstRows.length)
    expect(new Set(first.values()).size).toBe(firstRows.length)
    expect(new Set(second.values()).size).toBe(secondRows.length)
    expect(overlap.length).toBeGreaterThan(0)
    for (const row of overlap) {
      expect(second.get(row)).toBe(first.get(row))
    }
  })

  it('keeps each raw row key across repeated renders', () => {
    const rows = selectManyPointData(cars, 0)
    const canonical = pointKeys(0)
    const repeated = pointKeys(0)

    expect(repeated.size).toBe(canonical.size)
    for (const row of rows) {
      expect(repeated.get(row)).toBe(canonical.get(row))
    }
  })

  it('declares the narrow unique model identity beside the mark', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/73-many-point-scatter/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('JSON.stringify([')
    expect(source).toContain("row.name, row.year, row['weight (lb)']")
    expect(source).not.toContain("key: 'name'")
    expect(source).toContain('dot(points')
    expect(source).not.toContain('points.map(')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
  })
})

function pointKeys(revision: number) {
  const rows = selectManyPointData(cars, revision)
  const input = { width: 640, height: 400, revision }
  const scene = createChartRuntime<CarDatum>().render(
    createExampleChart(input),
    input,
  )
  const points = scene.points.filter(
    (point): point is ChartPoint<CarDatum, number, number> =>
      point.markId === 'cars',
  )

  expect(points).toHaveLength(rows.length)
  points.forEach((point, index) => expect(point.datum).toBe(rows[index]))
  return new Map(points.map((point) => [point.datum, point.key]))
}
