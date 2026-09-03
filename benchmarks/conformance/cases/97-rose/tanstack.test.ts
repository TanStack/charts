import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { alphabet } from '@tanstack/charts-data/alphabet'
import { createChartRuntime } from '@tanstack/charts'
import { arc, pointRadial } from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { selectRoseData } from './selection'
import { createExampleChart } from './tanstack'
import type { AlphabetRow } from '@tanstack/charts-data/alphabet'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const colors = [
  '#0369a1',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#c026d3',
  '#db2777',
]
const maximumFrequency = alphabet[0]?.frequency ?? 1
const tau = Math.PI * 2

describe('native radius-extending rose bars', () => {
  it.each([0, 1])(
    'renders revision %s directly from raw source rows with semantic identity',
    (revision) => {
      const nextInput = { ...input, revision }
      const selected = selectRoseData(alphabet, revision)
      const scene = render(nextInput)
      const points = barPoints(scene.points)
      const areas = areaNodes(scene.nodes)

      expect(points).toHaveLength(6)
      expect(areas).toHaveLength(6)
      expect(points.map(({ datum }) => datum)).toEqual(selected)
      expect(points.map(({ datumIndex }) => datumIndex)).toEqual([
        0, 1, 2, 3, 4, 5,
      ])
      expect(points.map(({ xValue }) => xValue)).toEqual(
        selected.map(({ letter }) => letter),
      )
      expect(points.map(({ yValue }) => yValue)).toEqual(
        selected.map(({ frequency }) => frequency),
      )
      expect(points.map(({ y1Value }) => y1Value)).toEqual(
        selected.map(() => 0),
      )
      expect(points.map(({ y2Value }) => y2Value)).toEqual(
        selected.map(({ frequency }) => frequency),
      )
      expect(points.every(({ yInterval }) => yInterval === 'difference')).toBe(
        true,
      )
      expect(points.map(({ color }) => color)).toEqual(colors)
      expect(areas.map(({ style }) => style?.fill)).toEqual(colors)

      points.forEach((point, index) => {
        expect(point.datum).toBe(selected[index])
        expect(point.group).toBeNull()
      })
      expect(new Set(points.map(({ key }) => key)).size).toBe(points.length)
      areas.forEach((area, index) => {
        expect(area.key).toBe(points[index]?.key)
        expect(area.style).toMatchObject({
          stroke: '#ffffff',
          strokeWidth: 1,
        })
      })
    },
  )

  it.each([
    { width: 200, height: 200, revision: 0 },
    { width: 640, height: 400, revision: 1 },
  ])(
    'maps one categorical angle band and the fixed radial range at $width×$height',
    ({ width, height, revision }) => {
      const nextInput = { ...input, width, height, revision }
      const selected = selectRoseData(alphabet, revision)
      const scene = render(nextInput)
      const points = barPoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const radius = (Math.min(width, height) * 0.8) / 2
      const band = tau / selected.length
      const expectedArc = arc<AlphabetRow>()
        .startAngle((_row, index) => index * band)
        .endAngle((_row, index) => (index + 1) * band)
        .innerRadius(0)
        .outerRadius((row) => roseRadius(row.frequency, radius))

      selected.forEach((row, index) => {
        const outerRadius = roseRadius(row.frequency, radius)
        const [x, y] = pointRadial((index + 0.5) * band, outerRadius)

        expect(areas[index]?.path).toBe(expectedArc(row, index, selected))
        expect(points[index]).toMatchObject({
          datum: row,
          x: expect.closeTo(width / 2 + x, 8),
          y: expect.closeTo(height / 2 + y, 8),
        })
        expect(
          Math.hypot(
            points[index]!.x - width / 2,
            points[index]!.y - height / 2,
          ),
        ).toBeCloseTo(outerRadius, 8)
      })

      if (revision === 0) {
        expect(
          Math.hypot(points[0]!.x - width / 2, points[0]!.y - height / 2),
        ).toBeCloseTo(radius, 8)
      } else {
        expect(
          Math.hypot(points[0]!.x - width / 2, points[0]!.y - height / 2),
        ).toBeLessThan(radius)
      }
    },
  )

  it('keeps keys stable for repeated rows and keyed to revised letters', () => {
    const first = barPoints(render(input).points)
    const repeated = barPoints(render(input).points)
    const revised = barPoints(render({ ...input, revision: 1 }).points)
    const firstByLetter = keyByLetter(first)
    const repeatedByLetter = keyByLetter(repeated)
    const revisedByLetter = keyByLetter(revised)

    expect(repeatedByLetter).toEqual(firstByLetter)
    expect(new Set(firstByLetter.values()).size).toBe(first.length)
    expect(new Set(revisedByLetter.values()).size).toBe(revised.length)
    expect([...revisedByLetter.keys()]).not.toEqual([...firstByLetter.keys()])
    for (const letter of firstByLetter.keys()) {
      expect(revisedByLetter.has(letter)).toBe(false)
    }
  })

  it('keeps radial allocation in the public definition without D3 geometry DTOs', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/97-rose/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('radialBarRadius(data, {')
    expect(source).toContain('scale: () => scaleBand<string>()')
    expect(source).toContain('scaleLinear().domain([0, maximumFrequency])')
    expect(source).toContain('({ radius }) => radius * 0.3')
    expect(source).toContain("angle: 'letter'")
    expect(source).toContain("radius: 'frequency'")
    expect(source).toContain("key: 'letter'")
    expect(source).toContain("color: 'letter'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('pieLayout')
    expect(source).not.toContain('PieArcDatum')
    expect(source).not.toContain('generator:')
    expect(source).not.toContain('radius1:')
  })
})

function roseRadius(frequency: number, radius: number): number {
  return radius * (0.3 + (0.7 * frequency) / maximumFrequency)
}

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function barPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<AlphabetRow, string, number> =>
      point.markId === 'letter-bars',
  )
}

function keyByLetter(
  points: readonly ChartPoint<AlphabetRow, string, number>[],
) {
  return new Map(points.map((point) => [point.datum.letter, point.key]))
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
