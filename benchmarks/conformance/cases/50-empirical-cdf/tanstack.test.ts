import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cars } from '@charts-poc/demo-data/cars'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { empiricalCdfDefinition } from './tanstack'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ChartPoint } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

type RankedCar = Omit<CarsRow, 'economy (mpg)'> & {
  readonly 'economy (mpg)': number
  readonly rank: number
  readonly probability: number
  readonly source: readonly CarsRow[]
  readonly sourceIndexes: readonly number[]
}

describe('native empirical CDF preparation', () => {
  it.each([0, 1])(
    'keeps rank ties and direct source lineage for revision %s',
    (revision) => {
      const source = cars
        .filter(
          (row): row is CarsRow & { 'economy (mpg)': number } =>
            row['economy (mpg)'] !== null,
        )
        .slice(revision * 8)
        .sort((left, right) => left['economy (mpg)'] - right['economy (mpg)'])
      const points = render({ ...input, revision }).points.filter(
        isEmpiricalPoint,
      )

      expect(points).toHaveLength(source.length)
      expect(points.map(({ datum }) => datum['economy (mpg)'])).toEqual(
        source.map((row) => row['economy (mpg)']),
      )
      points.forEach(({ datum }, index) => {
        expect(datum.probability).toBe(datum.rank / source.length)
        expect(datum.source).toEqual([source[index]])
        expect(datum.source[0]).toBe(source[index])
        expect(datum.sourceIndexes).toEqual([index])
      })

      const ranksByEconomy = new Map<number, Set<number>>()
      points.forEach(({ datum }) => {
        const economy = datum['economy (mpg)']
        const ranks = ranksByEconomy.get(economy) ?? new Set<number>()
        ranks.add(datum.rank)
        ranksByEconomy.set(economy, ranks)
      })
      expect(
        [...ranksByEconomy.values()].every((ranks) => ranks.size === 1),
      ).toBe(true)
    },
  )

  it('keeps ranking visible on the public definition surface', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/50-empirical-cdf/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("rank(source, { value: 'economy (mpg)'")
    expect(source).toContain('probability: row.rank / source.length')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('empiricalProbability')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime<RankedCar>().render(
    empiricalCdfDefinition(nextInput),
    nextInput,
  )
}

function isEmpiricalPoint(
  point: ChartPoint<unknown>,
): point is ChartPoint<RankedCar> {
  return point.markId === 'empirical-cdf'
}
