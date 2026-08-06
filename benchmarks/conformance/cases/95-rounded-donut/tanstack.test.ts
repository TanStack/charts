import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { createChartRuntime } from '@tanstack/charts'
import { arc } from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { selectRoundedDonutData } from './selection'
import { roundedDonutDefinition } from './tanstack'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const gapAngle = (Math.PI / 180) * 3

describe('native rounded-donut allocation', () => {
  it.each([0, 1])(
    'renders revision %s as flat source-linked intervals with direct gaps',
    (revision) => {
      const nextInput = { ...input, revision }
      const selected = selectRoundedDonutData(alphabet, revision)
      const scene = render(nextInput)
      const points = slicePoints(scene.points)
      const data = points.map(({ datum }) => datum)
      const areas = areaNodes(scene.nodes)
      const visibleSweep = data.reduce(
        (sum, row) => sum + row.endAngle - row.startAngle,
        0,
      )

      expect(points).toHaveLength(5)
      expect(areas).toHaveLength(5)
      expect(data.map(({ letter }) => letter)).toEqual(
        selected.map(({ letter }) => letter),
      )
      expect(data.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4])
      expect(data[0]?.startAngle).toBe(0)
      expect(Math.PI * 2 - data.at(-1)!.endAngle).toBeCloseTo(gapAngle, 12)
      expect(visibleSweep + data.length * gapAngle).toBeCloseTo(Math.PI * 2, 12)
      expect(data.reduce((sum, row) => sum + row.fraction, 0)).toBeCloseTo(1)

      data.forEach((row, index) => {
        expect(row.padAngle).toBe(0)
        expect(row).not.toHaveProperty('data')
        expect(row.source).toEqual([selected[index]])
        expect(row.source[0]).toBe(selected[index])
        expect(row.sourceIndexes).toEqual([index])
        if (index > 0) {
          expect(row.startAngle - data[index - 1]!.endAngle).toBeCloseTo(
            gapAngle,
            12,
          )
        }
      })
    },
  )

  it.each([
    { width: 200, height: 200 },
    { width: 640, height: 400 },
  ])(
    'keeps rounded annular paths responsive at $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const scene = render(nextInput)
      const points = slicePoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const outerRadius = (Math.min(width, height) * 0.8) / 2
      const innerRadius = outerRadius * 0.58
      const centroidRadius = (innerRadius + outerRadius) / 2
      const expected = arc<PieDatum<AlphabetRow>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(8)

      points.forEach((point, index) => {
        expect(point.yValue).toBeCloseTo(centroidRadius, 12)
        expect(areas[index]?.path).toBe(expected(point.datum))
      })
    },
  )

  it('uses semantic letter keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstPoints = slicePoints(first.points)
    const firstKeys = firstPoints.map(({ key }) => key)

    expect(slicePoints(repeated.points).map(({ key }) => key)).toEqual(
      firstKeys,
    )
    expect(slicePoints(revised.points).map(({ key }) => key)).not.toEqual(
      firstKeys,
    )
    firstPoints.forEach((point) => {
      expect(point.key).toContain(point.datum.letter)
    })
  })

  it('keeps allocation, gaps, and flat tooltip data in the public definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/95-rounded-donut/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("value: 'frequency'")
    expect(source).toContain('gapAngle,')
    expect(source).toContain("id: 'letter-slices'")
    expect(source).toContain("key: 'letter'")
    expect(source).toContain('cornerRadius: 8')
    expect(source).toContain('datum.frequency')
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('.data')
    expect(source).not.toContain('pieLayout')
    expect(source).not.toContain('endAngle -')
    expect(source).not.toContain('padAngle:')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(
    roundedDonutDefinition(nextInput),
    nextInput,
  )
}

function slicePoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<AlphabetRow>, number, number> =>
      point.markId === 'letter-slices',
  )
}

function areaNodes(nodes: readonly SceneNode[]) {
  return flatten(nodes).filter(
    (node): node is Extract<SceneNode, { kind: 'area' }> =>
      node.kind === 'area',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
