import { penguins } from '@tanstack/charts-data/penguins'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { loadTanStackSources } from '../../native-catalog'
import { createExampleChart } from './tanstack'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'
import type { ChartPoint } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

interface GroupedPenguins {
  readonly species: string
  readonly sex: string
  readonly count: number
  readonly source: readonly PenguinsRow[]
  readonly sourceIndexes: readonly number[]
}

describe('grouped penguin bars', () => {
  it.each([0, 1])(
    'counts compound groups and preserves observation lineage at revision %i',
    (revision) => {
      const input = {
        width: 720,
        height: 480,
        revision,
      } satisfies ConformanceInput
      const observations = penguins
        .slice(0, penguins.length - revision * 12)
        .filter((row) => row.sex !== null)
      const bars = render(input).points.filter(
        (point) => point.markId === 'penguin-count-bars',
      ) as ChartPoint<GroupedPenguins, string, number>[]

      expect(bars).toHaveLength(6)
      expect(
        bars.map(({ datum }) => [datum.species, datum.sex, datum.count]),
      ).toEqual([
        ['Adelie', 'MALE', count(observations, 'Adelie', 'MALE')],
        ['Adelie', 'FEMALE', count(observations, 'Adelie', 'FEMALE')],
        ['Chinstrap', 'FEMALE', count(observations, 'Chinstrap', 'FEMALE')],
        ['Chinstrap', 'MALE', count(observations, 'Chinstrap', 'MALE')],
        ['Gentoo', 'FEMALE', count(observations, 'Gentoo', 'FEMALE')],
        ['Gentoo', 'MALE', count(observations, 'Gentoo', 'MALE')],
      ])

      for (const { datum } of bars) {
        expect(datum.count).toBe(datum.source.length)
        expect(datum.sourceIndexes).toHaveLength(datum.count)
        datum.sourceIndexes.forEach((sourceIndex, index) => {
          expect(datum.source[index]).toBe(observations[sourceIndex])
          expect(datum.source[index]).toMatchObject({
            species: datum.species,
            sex: datum.sex,
          })
        })
      }

      expect(
        bars
          .flatMap(({ datum }) => datum.sourceIndexes)
          .sort((left, right) => left - right),
      ).toEqual(
        Array.from({ length: observations.length }, (_, index) => index),
      )
    },
  )

  it('keeps compound aggregation in the authored source closure', async () => {
    const closure = await loadTanStackSources('bar-grouped')
    const source = closure.files.map((file) => file.source).join('\n')

    expect(source).toContain('const rows = groupBy(observations, {')
    expect(source).toContain("by: { species: 'species', sex: 'sex' }")
    expect(source).toContain("outputs: { count: { reduce: 'count' } }")
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('rollups(')
  })
})

function render(input: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(input), input)
}

function count(
  rows: readonly PenguinsRow[],
  species: string,
  sex: string,
): number {
  return rows.filter((row) => row.species === species && row.sex === sex).length
}
