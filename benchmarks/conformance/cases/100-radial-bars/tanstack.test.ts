import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleBand } from 'd3-scale'
import { arc } from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { selectRadialBarData } from './selection'
import { radialBarsDefinition } from './tanstack'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const innerRadiusRatio = 0.2
const radiusRatio = 0.84
const maximumFrequency = alphabet[0]?.frequency ?? 1
const colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b']

describe('native concentric radial bars', () => {
  it.each([0, 1])(
    'renders revision %s from the four raw selected rows on one fixed angle scale',
    (revision) => {
      const nextInput = { ...input, revision }
      const selected = selectRadialBarData(alphabet, revision)
      const scene = render(nextInput)
      const points = barPoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const radiusScale = radialBandScale(selected, nextInput)

      expect(points).toHaveLength(4)
      expect(areas).toHaveLength(4)
      expect(points.map(({ datum }) => datum)).toEqual(selected)
      points.forEach((point, index) => {
        const row = selected[index]!
        const angle = (row.frequency / maximumFrequency) * Math.PI * 2
        const centerRadius =
          radiusScale(row.letter)! + radiusScale.bandwidth() / 2

        expect(point.datum).toBe(row)
        expect(point.datum).not.toHaveProperty('ring')
        expect(point.xValue).toBe(row.frequency)
        expect(point.x1Value).toBe(0)
        expect(point.x2Value).toBe(row.frequency)
        expect(point.yValue).toBe(row.letter)
        expect(point.key).toContain(row.letter)
        expect(point.x).toBeCloseTo(
          nextInput.width / 2 + Math.sin(angle) * centerRadius,
          12,
        )
        expect(point.y).toBeCloseTo(
          nextInput.height / 2 - Math.cos(angle) * centerRadius,
          12,
        )
      })
      expect(areas.map(({ style }) => style?.fill)).toEqual(colors)
    },
  )

  it.each([
    { width: 200, height: 200 },
    { width: 640, height: 400 },
  ])(
    'maps categorical bands through the responsive 0.2R to R range at $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const selected = selectRadialBarData(alphabet, input.revision)
      const scene = render(nextInput)
      const points = barPoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const radiusScale = radialBandScale(selected, nextInput)
      const bandwidth = radiusScale.bandwidth()

      points.forEach((point, index) => {
        const row = selected[index]!
        const innerRadius = radiusScale(row.letter)!
        const outerRadius = innerRadius + bandwidth
        const expected = arc<null>()
          .startAngle(0)
          .endAngle((row.frequency / maximumFrequency) * Math.PI * 2)
          .innerRadius(innerRadius)
          .outerRadius(outerRadius)
          .cornerRadius(bandwidth / 2)(null)

        expect(areas[index]?.path).toBe(expected)
        expect(point.x2Value).toBe(row.frequency)
        expect(point.yValue).toBe(row.letter)
      })
    },
  )

  it('keeps semantic letter identity and palette order across renders', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstPoints = barPoints(first.points)
    const firstKeys = firstPoints.map(({ key }) => key)

    expect(barPoints(repeated.points).map(({ key }) => key)).toEqual(firstKeys)
    expect(barPoints(revised.points).map(({ key }) => key)).not.toEqual(
      firstKeys,
    )
    expect(firstPoints.map(({ color }) => color)).toEqual(colors)
    expect(barPoints(revised.points).map(({ color }) => color)).toEqual(colors)
  })

  it('keeps the complete radial-bar layout in the public definition', () => {
    const caseDirectory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/100-radial-bars',
    )
    const source = readFileSync(resolve(caseDirectory, 'example.tsx'), 'utf8')

    expect(source).toContain('radialBarAngle')
    expect(source).toContain("angle: 'frequency'")
    expect(source).toContain("radius: 'letter'")
    expect(source).toContain("key: 'letter'")
    expect(source).toContain('.paddingInner(0.38)')
    expect(source).toContain('.paddingOuter(0.19)')
    expect(source).toContain('radius * innerRadiusRatio')
    expect(source).toContain("cornerRadius: 'full'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('radialBarLayout')
    expect(source).not.toContain('generator:')
    expect(source).not.toContain('Math.round')
    expect(existsSync(resolve(caseDirectory, 'transform.ts'))).toBe(false)
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(radialBarsDefinition(nextInput), nextInput)
}

function radialBandScale(
  data: readonly AlphabetRow[],
  nextInput: ConformanceInput,
) {
  const radius = (Math.min(nextInput.width, nextInput.height) / 2) * radiusRatio
  return scaleBand<string>()
    .domain(data.map(({ letter }) => letter))
    .range([radius * innerRadiusRatio, radius])
    .paddingInner(0.38)
    .paddingOuter(0.19)
}

function barPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<AlphabetRow, number, string> =>
      point.markId === 'letter-bars',
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
