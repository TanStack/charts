import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { survey } from '@charts-poc/demo-data/survey'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { agreementPercent } from './transform'
import { gaugeDefinition } from './tanstack'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { GaugeDatum } from './transform'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const startAngle = (-Math.PI * 3) / 4
const endAngle = (Math.PI * 3) / 4

describe('native gauge allocation', () => {
  it('renders flat source-linked segments over the authored partial sweep', () => {
    const agreement = agreementPercent(survey, 'Q1')
    const scene = render(input)
    const points = gaugePoints(scene.points)
    const data = points.map(({ datum }) => datum)
    const outerRadius = (Math.min(input.width, input.height) * 0.8) / 2
    const centroidRadius = (outerRadius + outerRadius * 0.72) / 2

    expect(points).toHaveLength(2)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(2)
    points.forEach(({ yValue }) => expect(yValue).toBeCloseTo(centroidRadius))
    expect(data.map(({ id }) => id)).toEqual(['value', 'remainder'])
    expect(data.map(({ value }) => value)).toEqual([agreement, 100 - agreement])
    expect(data.map(({ fraction }) => fraction)).toEqual([
      agreement / 100,
      (100 - agreement) / 100,
    ])
    expect(data[0]?.startAngle).toBe(startAngle)
    expect(data[0]?.endAngle).toBeCloseTo(
      startAngle + (endAngle - startAngle) * (agreement / 100),
      12,
    )
    expect(data[0]?.endAngle).toBe(data[1]?.startAngle)
    expect(data[1]?.endAngle).toBe(endAngle)

    data.forEach((row, index) => {
      expect(row).not.toHaveProperty('data')
      expect(row.source).toHaveLength(1)
      expect(row.source[0]).toMatchObject({
        id: row.id,
        label: row.label,
        value: row.value,
      })
      expect(row.sourceIndexes).toEqual([index])
    })
  })

  it('keeps semantic segment keys while the selected question changes', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstPoints = gaugePoints(first.points)
    const revisedPoints = gaugePoints(revised.points)
    const firstKeys = firstPoints.map(({ key }) => key)

    expect(gaugePoints(repeated.points).map(({ key }) => key)).toEqual(
      firstKeys,
    )
    expect(revisedPoints.map(({ key }) => key)).toEqual(firstKeys)
    expect(firstPoints.map(({ datum }) => datum.value)).not.toEqual(
      revisedPoints.map(({ datum }) => datum.value),
    )
    for (const point of firstPoints) {
      expect(point.key).toContain(point.datum.id)
    }
  })

  it('keeps only angular allocation in the public polar definition surface', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/78-gauge/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("value: 'value'")
    expect(source).toContain('startAngle,')
    expect(source).toContain('endAngle,')
    expect(source).toContain("key: 'id'")
    expect(source).toContain('agreementPercent(survey, question)')
    expect(source).toContain('datum.label')
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('.data.')
    expect(source).not.toContain('pieLayout')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(gaugeDefinition(nextInput), nextInput)
}

function gaugePoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<GaugeDatum>, number, number> =>
      point.markId === 'gauge-segments',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
