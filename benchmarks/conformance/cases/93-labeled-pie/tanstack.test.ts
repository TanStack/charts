import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { selectLabeledPieData } from './selection'
import { createExampleChart } from './tanstack'
import type { AlphabetRow } from '@tanstack/charts-data/alphabet'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const radiusRatio = 0.56
const labelOffset = 20

describe('native labeled pie composition', () => {
  it('renders flat pie rows through arcs, pixel-offset leaders, and labels', () => {
    const selected = selectLabeledPieData(alphabet, input.revision)
    const scene = render(input)
    const arcs = markPoints(scene.points, 'letter-slices')
    const labels = markPoints(scene.points, 'letter-labels')
    const nodes = flatten(scene.nodes)
    const rules = nodes.filter((node) => node.kind === 'rule')
    const text = nodes.filter((node) => node.kind === 'label')
    const outerRadius = (Math.min(input.width, input.height) / 2) * radiusRatio

    expect(arcs).toHaveLength(4)
    expect(labels).toHaveLength(4)
    expect(rules).toHaveLength(4)
    expect(text).toHaveLength(4)
    expect(arcs.map(({ datum }) => datum.letter)).toEqual(
      selected.map(({ letter }) => letter),
    )
    expect(labels.map(({ datum }) => datum.letter)).toEqual(
      selected.map(({ letter }) => letter),
    )

    labels.forEach((point, index) => {
      const row = point.datum
      const selectedRow = selected[index]!
      const expectedX =
        input.width / 2 + Math.sin(row.angle) * (outerRadius + labelOffset)
      const expectedY =
        input.height / 2 - Math.cos(row.angle) * (outerRadius + labelOffset)
      const label = text.find((node) => node.key.includes(row.letter))
      const rule = rules.find((node) => node.key.includes(row.letter))
      const side = Math.sin(row.angle)

      expect(row).not.toHaveProperty('data')
      expect(row.source).toEqual([selectedRow])
      expect(row.source[0]).toBe(selectedRow)
      expect(row.sourceIndexes).toEqual([index])
      expect(point).toMatchObject({
        key: expect.stringContaining(row.letter),
        xValue: row.angle,
        yValue: 1,
        x: expect.closeTo(expectedX, 8),
        y: expect.closeTo(expectedY, 8),
      })
      expect(label).toMatchObject({
        kind: 'label',
        text: row.letter,
        x: expect.closeTo(expectedX - input.width / 2, 8),
        y: expect.closeTo(expectedY - input.height / 2, 8),
        anchor: Math.abs(side) <= 1e-6 ? 'middle' : side < 0 ? 'end' : 'start',
      })
      expect(rule).toMatchObject({
        kind: 'rule',
        x1: expect.closeTo(Math.sin(row.angle) * outerRadius, 8),
        y1: expect.closeTo(-Math.cos(row.angle) * outerRadius, 8),
        x2: expect.closeTo(
          Math.sin(row.angle) * (outerRadius + labelOffset),
          8,
        ),
        y2: expect.closeTo(
          -Math.cos(row.angle) * (outerRadius + labelOffset),
          8,
        ),
      })
      expect(point.color).toBe(arcs[index]?.color)
    })
  })

  it('keeps the label offset fixed in pixels across responsive radii', () => {
    const smallInput = { ...input, width: 200, height: 200 }
    const largeInput = { ...input, width: 400, height: 400 }
    const small = markPoints(render(smallInput).points, 'letter-labels')
    const large = markPoints(render(largeInput).points, 'letter-labels')
    const smallRadius =
      (Math.min(smallInput.width, smallInput.height) / 2) * radiusRatio
    const largeRadius =
      (Math.min(largeInput.width, largeInput.height) / 2) * radiusRatio

    small.forEach((point) => {
      expect(
        Math.hypot(
          point.x - smallInput.width / 2,
          point.y - smallInput.height / 2,
        ),
      ).toBeCloseTo(smallRadius + labelOffset, 8)
    })
    large.forEach((point) => {
      expect(
        Math.hypot(
          point.x - largeInput.width / 2,
          point.y - largeInput.height / 2,
        ),
      ).toBeCloseTo(largeRadius + labelOffset, 8)
    })
  })

  it('uses semantic letter keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })

    for (const markId of ['letter-slices', 'letter-labels']) {
      const firstKeys = markPoints(first.points, markId).map(({ key }) => key)
      expect(markPoints(repeated.points, markId).map(({ key }) => key)).toEqual(
        firstKeys,
      )
      expect(
        markPoints(revised.points, markId).map(({ key }) => key),
      ).not.toEqual(firstKeys)
    }
  })

  it('keeps all shared plotting work in the public polar definition surface', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/93-labeled-pie/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("value: 'frequency'")
    expect(source).toContain('radius2Offset: labelOffset')
    expect(source).toContain('radiusOffset: labelOffset')
    expect(source).toContain("anchor: 'outside'")
    expect(source).toContain("key: 'letter'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('.data.')
    expect(source).not.toContain('pieLayout')
    expect(source).not.toContain('PieLabelDatum')
    expect(source).not.toContain('arcs.map(')
    expect(source).not.toContain('defineChart(({')
    expect(source).not.toContain('Math.min(width')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function markPoints(points: readonly ChartPoint<unknown>[], markId: string) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<AlphabetRow>, number, number> =>
      point.markId === markId,
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
