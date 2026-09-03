import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { selectCenterDonutData } from './selection'
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

interface CenterDatum {
  readonly id: 'total'
  readonly angle: 0
  readonly radius: 0
  readonly text: string
}

describe('native center-donut allocation', () => {
  it.each([
    { revision: 0, total: 0.29925, text: '29.9%' },
    { revision: 1, total: 0.21222, text: '21.2%' },
  ])(
    'renders flat source-linked slices and the selected total for revision $revision',
    ({ revision, total, text }) => {
      const nextInput = { ...input, revision }
      const selected = selectCenterDonutData(alphabet, revision)
      const scene = render(nextInput)
      const points = slicePoints(scene.points)
      const data = points.map(({ datum }) => datum)
      const nodes = flatten(scene.nodes)
      const center = centerPoints(scene.points)

      expect(points).toHaveLength(3)
      expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(3)
      expect(center).toHaveLength(1)
      expect(nodes.filter((node) => node.kind === 'label')).toHaveLength(1)
      expect(selected.reduce((sum, row) => sum + row.frequency, 0)).toBeCloseTo(
        total,
        12,
      )
      expect(center[0]?.datum.text).toBe(text)
      expect(data.map(({ letter }) => letter)).toEqual(
        selected.map(({ letter }) => letter),
      )
      expect(data.map(({ index }) => index)).toEqual([0, 1, 2])
      expect(data[0]?.startAngle).toBe(0)
      expect(data.at(-1)?.endAngle).toBe(Math.PI * 2)
      expect(data.reduce((sum, row) => sum + row.fraction, 0)).toBeCloseTo(1)

      data.forEach((row, index) => {
        expect(row.fraction).toBeCloseTo(selected[index]!.frequency / total, 12)
        expect(row).not.toHaveProperty('data')
        expect(row.source).toEqual([selected[index]])
        expect(row.source[0]).toBe(selected[index])
        expect(row.sourceIndexes).toEqual([index])
      })
    },
  )

  it.each([
    { width: 640, height: 400 },
    { width: 320, height: 240 },
  ])(
    'keeps the annulus responsive and the total at the exact center for $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const scene = render(nextInput)
      const points = slicePoints(scene.points)
      const center = centerPoints(scene.points)[0]
      const outerRadius = (Math.min(width, height) * 0.8) / 2
      const centroidRadius = (outerRadius + outerRadius * 0.62) / 2
      const centerLabel = flatten(scene.nodes).find(
        (node) => node.kind === 'label' && node.text === '29.9%',
      )
      const polarGroup = flatten(scene.nodes).find(
        (node) =>
          node.kind === 'group' && node.className?.includes('ts-chart__polar'),
      )

      points.forEach(({ yValue }) => expect(yValue).toBeCloseTo(centroidRadius))
      expect(center).toMatchObject({
        x: width / 2,
        y: height / 2,
        xValue: 0,
        yValue: 0,
      })
      expect(centerLabel).toMatchObject({
        kind: 'label',
        x: 0,
        y: 0,
        text: '29.9%',
      })
      expect(polarGroup).toMatchObject({
        kind: 'group',
        translateX: width / 2,
        translateY: height / 2,
      })
    },
  )

  it('uses semantic slice and center keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstSliceKeys = slicePoints(first.points).map(({ key }) => key)
    const firstCenterKey = centerPoints(first.points)[0]?.key

    expect(slicePoints(repeated.points).map(({ key }) => key)).toEqual(
      firstSliceKeys,
    )
    expect(slicePoints(revised.points).map(({ key }) => key)).not.toEqual(
      firstSliceKeys,
    )
    expect(centerPoints(repeated.points)[0]?.key).toBe(firstCenterKey)
    expect(centerPoints(revised.points)[0]?.key).toBe(firstCenterKey)
    expect(centerPoints(revised.points)[0]?.datum.text).toBe('21.2%')
    for (const point of slicePoints(first.points)) {
      expect(point.key).toContain(point.datum.letter)
    }
    expect(firstCenterKey).toContain('total')
  })

  it('keeps allocation and flat tooltip data in the public polar definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/94-center-donut/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("pie(data, { value: 'frequency' })")
    expect(source).toContain("id: 'letter-slices'")
    expect(source).toContain("key: 'letter'")
    expect(source).toContain("id: 'center-total'")
    expect(source).toContain("key: 'id'")
    expect(source).toContain('data.reduce')
    expect(source).toContain("'letter' in datum")
    expect(source).toContain('datum.frequency')
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('.data.')
    expect(source).not.toContain('pieLayout')
    expect(source).not.toContain('PieArcDatum')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function slicePoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<AlphabetRow>, number, number> =>
      point.markId === 'letter-slices',
  )
}

function centerPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<CenterDatum, number, number> =>
      point.markId === 'center-total',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
