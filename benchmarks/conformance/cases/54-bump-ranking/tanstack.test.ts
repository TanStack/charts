import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { bumpRankingDefinition } from './tanstack'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ChartPoint } from '@tanstack/charts'

type RankedIndustry = IndustriesRow & {
  readonly rank: number
  readonly source: readonly IndustriesRow[]
  readonly sourceIndexes: readonly number[]
}

describe('native bump-ranking labels', () => {
  it('selects each industry label by maximum date instead of input position', () => {
    const runtime = createChartRuntime()
    const first = runtime.render(bumpRankingDefinition(), {
      width: 640,
      height: 400,
    })
    const repeated = runtime.render(bumpRankingDefinition(), {
      width: 640,
      height: 400,
    })
    const rows = markPoints(first.points, 'industry-ranks')
    const labels = markPoints(first.points, 'newest-industry-labels')

    expect(rows).toHaveLength(35)
    expect(labels).toHaveLength(5)
    labels.forEach((label) => {
      const industryRows = rows.filter(
        ({ datum }) => datum.industry === label.datum.industry,
      )
      const newest = Math.max(
        ...industryRows.map(({ datum }) => datum.date.getTime()),
      )

      expect(label.datum.date.getTime()).toBe(newest)
      expect(label.datum.source).toHaveLength(1)
      expect(label.datum.source[0]).toBeInstanceOf(Object)
    })
    expect(
      markPoints(repeated.points, 'newest-industry-labels').map(
        ({ key }) => key,
      ),
    ).toEqual(labels.map(({ key }) => key))
  })

  it('makes the order-independent newest-row selection explicit', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/54-bump-ranking/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('value: (datum) => datum.date.getTime()')
    expect(source).toContain("select: 'max'")
    expect(source).not.toContain("select: 'last'")
  })
})

function markPoints(points: readonly ChartPoint<unknown>[], markId: string) {
  return points.filter(
    (point): point is ChartPoint<RankedIndustry> => point.markId === markId,
  )
}
