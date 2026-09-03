import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { selectPieData } from './selection'
import { createExampleChart } from './tanstack'
import type { AlphabetRow } from '@tanstack/charts-data/alphabet'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('native pie allocation', () => {
  it('renders four flat source-linked arc rows in authored order', () => {
    const selected = selectPieData(alphabet, input.revision)
    const scene = render(input)
    const points = piePoints(scene.points)
    const data = points.map(({ datum }) => datum)

    expect(points).toHaveLength(4)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(4)
    expect(data.map(({ letter }) => letter)).toEqual(
      selected.map(({ letter }) => letter),
    )
    expect(data.map(({ index }) => index)).toEqual([0, 1, 2, 3])
    expect(data[0]?.startAngle).toBe(0)
    expect(data.at(-1)?.endAngle).toBe(Math.PI * 2)
    expect(data.reduce((sum, row) => sum + row.fraction, 0)).toBeCloseTo(1)

    data.forEach((row, index) => {
      expect(row).not.toHaveProperty('data')
      expect(row.source).toEqual([selected[index]])
      expect(row.source[0]).toBe(selected[index])
      expect(row.sourceIndexes).toEqual([index])
    })
  })

  it('uses semantic letter keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstKeys = piePoints(first.points).map(({ key }) => key)

    expect(piePoints(repeated.points).map(({ key }) => key)).toEqual(firstKeys)
    expect(piePoints(revised.points).map(({ key }) => key)).not.toEqual(
      firstKeys,
    )
    for (const point of piePoints(first.points)) {
      expect(point.key).toContain(point.datum.letter)
    }
  })

  it('keeps allocation in the public polar definition surface', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'benchmarks/conformance/cases/76-pie/example.tsx'),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("value: 'frequency'")
    expect(source).toContain("key: 'letter'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('.data.')
    expect(source).not.toContain('pieLayout')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function piePoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<AlphabetRow>, number, number> =>
      point.markId === 'letter-slices',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
