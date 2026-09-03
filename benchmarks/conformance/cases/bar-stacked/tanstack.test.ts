import { crimeanWar } from '@tanstack/charts-data/crimean-war'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { loadTanStackSources } from '../../native-catalog'
import { createExampleChart } from './tanstack'
import type { CrimeanWarRow } from '@tanstack/charts-data/crimean-war'
import type { ChartPoint } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const causes = ['disease', 'wounds', 'other'] as const
type Cause = (typeof causes)[number]

interface FoldedDeathRow extends CrimeanWarRow {
  readonly cause: Cause
  readonly deaths: number
  readonly source: readonly CrimeanWarRow[]
  readonly sourceIndexes: readonly number[]
}

describe('stacked Crimean War bars', () => {
  it.each([0, 1])(
    'folds wide rows with lineage and preserves stack totals at revision %i',
    (revision) => {
      const input = {
        width: 720,
        height: 480,
        revision,
      } satisfies ConformanceInput
      const sourceRows = crimeanWar.slice(revision)
      const bars = render(input).points.filter(
        (point) => point.markId === 'death-bars',
      ) as ChartPoint<FoldedDeathRow, Date, number>[]

      expect(bars).toHaveLength(sourceRows.length * causes.length)

      for (const point of bars) {
        const { datum } = point
        const sourceIndex = datum.sourceIndexes[0]!
        const source = sourceRows[sourceIndex]!

        expect(datum.sourceIndexes).toEqual([sourceIndex])
        expect(datum.source).toEqual([source])
        expect(datum.source[0]).toBe(source)
        expect(datum.date).toBe(source.date)
        expect(datum.deaths).toBe(source[datum.cause])
        expect(point.yValue).toBe(datum.deaths)
        expect(Number(point.y2Value) - Number(point.y1Value)).toBeCloseTo(
          datum.deaths,
          12,
        )
      }

      for (const source of sourceRows) {
        const month = bars.filter(({ datum }) => datum.date === source.date)
        const total = causes.reduce((sum, cause) => sum + source[cause], 0)

        expect(month).toHaveLength(causes.length)
        expect(month.map(({ datum }) => datum.cause)).toEqual(causes)
        expect(Math.min(...month.map(({ y1Value }) => Number(y1Value)))).toBe(0)
        expect(Math.max(...month.map(({ y2Value }) => Number(y2Value)))).toBe(
          total,
        )
      }
    },
  )

  it('keeps wide-to-long reshaping in the authored source closure', async () => {
    const closure = await loadTanStackSources('bar-stacked')
    const source = closure.files.map((file) => file.source).join('\n')

    expect(source).toContain('const rows = fold(')
    expect(source).toContain('fields: causes')
    expect(source).toContain("as: { key: 'cause', value: 'deaths' }")
    expect(source).not.toContain('.flatMap(')
    expect(source).not.toContain('causes.map(')
  })
})

function render(input: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(input), input)
}
