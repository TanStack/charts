import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { citywages } from '@charts-poc/demo-data/citywages'
import { describe, expect, it } from 'vitest'
import { wageFields } from './selection'
import { slopegraphDefinition } from './tanstack'
import type { CitywagesRow } from '@charts-poc/demo-data/citywages'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'
import type { WageField } from './selection'

interface SlopeDatum {
  readonly Metro: string
  readonly wageField: WageField
  readonly source: readonly CitywagesRow[]
}

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('folded slopegraph', () => {
  it('renders two ordered endpoints and one selected label per metro', () => {
    const scene = render(input)
    const lines = slopePoints(scene, 'metro-lines')
    const dots = slopePoints(scene, 'metro-points')
    const labels = slopePoints(scene, 'endpoint-labels')

    expect(lines).toHaveLength(16)
    expect(dots).toHaveLength(16)
    expect(labels).toHaveLength(8)
    expect(lines.slice(0, 2).map(({ xValue }) => xValue)).toEqual([
      '1980',
      '2015',
    ])
    expect(lines.slice(0, 2).map(({ datum }) => datum.wageField)).toEqual(
      wageFields,
    )
    expect(labels.every(({ datum }) => datum.wageField === wageFields[1])).toBe(
      true,
    )

    const sourceRows = citywages.slice(0, 8)
    for (const point of lines) {
      expect(point.datum.source[0]).toBe(
        sourceRows.find(({ Metro }) => Metro === point.datum.Metro),
      )
    }
  })

  it('keeps point identities deterministic and updates the source window', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const keys = (scene: typeof first) =>
      slopePoints(scene, 'metro-points').map(({ key }) => key)

    expect(keys(repeated)).toEqual(keys(first))
    expect(new Set(keys(first)).size).toBe(16)
    expect(keys(revised)).not.toEqual(keys(first))
    expect(slopePoints(revised, 'metro-points')).toHaveLength(16)
  })

  it('keeps fold, endpoint selection, accessors, and keys beside the definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/30-slopegraph/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/transform/fold'")
    expect(source).toContain('const rows = fold(source')
    expect(source).toContain('const labels = select(rows')
    expect(source).toContain('x: ({ wageField }) => wageYear(wageField)')
    expect(source).toContain('`${Metro}:${wageField}`')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(slopegraphDefinition(nextInput), {
    width: nextInput.width,
    height: nextInput.height,
  })
}

function slopePoints(
  scene: ChartScene,
  markId: string,
): ChartPoint<SlopeDatum>[] {
  return scene.points.filter(
    (point): point is ChartPoint<SlopeDatum> =>
      point.markId === markId && isSlopeDatum(point.datum),
  )
}

function isSlopeDatum(datum: unknown): datum is SlopeDatum {
  return (
    typeof datum === 'object' &&
    datum !== null &&
    'Metro' in datum &&
    typeof datum.Metro === 'string' &&
    'wageField' in datum &&
    (datum.wageField === wageFields[0] || datum.wageField === wageFields[1]) &&
    'source' in datum &&
    Array.isArray(datum.source)
  )
}
