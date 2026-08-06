import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { logScaleScatterDefinition } from './tanstack'
import type { ChartPoint } from '@tanstack/charts'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

type SizedFlareRow = FlareRow & { readonly size: number }

describe('native log-scale scatter preparation', () => {
  it('keeps only positive log-domain rows with stable model identity', () => {
    const first = points(render(input).points)
    const revised = points(render({ ...input, revision: 1 }).points)
    const firstKeys = new Map(
      first.map((point) => [point.datum.name, point.key]),
    )

    expect(first).toHaveLength(200)
    expect(revised).toHaveLength(200)
    expect(first.every(({ datum }) => datum.size > 0)).toBe(true)
    expect(revised.every(({ datum }) => datum.size > 0)).toBe(true)
    revised.forEach((point) => {
      const previous = firstKeys.get(point.datum.name)
      if (previous !== undefined) expect(point.key).toBe(previous)
    })
  })

  it('makes the positive-domain guard and semantic key explicit', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/53-log-scale-scatter/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('row.size !== null && row.size > 0')
    expect(source).toContain("key: 'name'")
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(
    logScaleScatterDefinition(nextInput),
    nextInput,
  )
}

function points(source: readonly ChartPoint<unknown>[]) {
  return source.filter(
    (point): point is ChartPoint<SizedFlareRow> =>
      point.markId === 'class-size-points',
  )
}
