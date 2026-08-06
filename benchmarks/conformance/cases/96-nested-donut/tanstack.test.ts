import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flare } from '@charts-poc/demo-data/flare'
import { createChartRuntime } from '@tanstack/charts'
import { arc } from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { nestedFlareDonut } from './transform'
import { nestedDonutDefinition } from './tanstack'
import type { FlareDonutDetail, FlareDonutSlice } from './transform'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('native nested-donut allocation', () => {
  it.each([0, 1])(
    'allocates both rings independently with flat lineage for revision %s',
    (revision) => {
      const nextInput = { ...input, revision }
      const sourceRows =
        revision % 2 === 0
          ? flare
          : flare.filter((row) => row.size === null || row.size >= 1_000)
      const prepared = nestedFlareDonut(sourceRows)
      const scene = render(nextInput)
      const families = familyPoints(scene.points)
      const details = detailPoints(scene.points)

      expect(families).toHaveLength(2)
      expect(details).toHaveLength(4)
      expect(areaNodes(scene.nodes)).toHaveLength(6)
      expect(families.map(({ datum }) => datum.name)).toEqual(
        prepared.inner.map(({ name }) => name),
      )
      expect(details.map(({ datum }) => datum.name)).toEqual(
        prepared.outer.map(({ name }) => name),
      )
      expect(families.map(({ datum }) => datum.index)).toEqual([0, 1])
      expect(details.map(({ datum }) => datum.index)).toEqual([0, 1, 2, 3])

      assertCompletePie(
        families.map(({ datum }) => datum),
        prepared.inner,
      )
      assertCompletePie(
        details.map(({ datum }) => datum),
        prepared.outer,
      )

      expect(details[1]?.datum.endAngle).toBeCloseTo(
        families[0]!.datum.endAngle,
        12,
      )
      expect(details[3]?.datum.endAngle).toBeCloseTo(
        families[1]!.datum.endAngle,
        12,
      )
    },
  )

  it.each([
    { width: 640, height: 400 },
    { width: 320, height: 240 },
  ])(
    'keeps both concentric annuli responsive at $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const scene = render(nextInput)
      const families = familyPoints(scene.points)
      const details = detailPoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const radius = (Math.min(width, height) * 0.8) / 2
      const expectedFamily = arc<PieDatum<FlareDonutSlice>>()
        .innerRadius(radius * 0.12)
        .outerRadius(radius * 0.46)
      const expectedDetail = arc<PieDatum<FlareDonutDetail>>()
        .innerRadius(radius * 0.56)
        .outerRadius(radius)

      expect(areas).toHaveLength(6)
      families.forEach((point, index) => {
        expect(point.yValue).toBeCloseTo(radius * 0.29, 12)
        expect(areas[index]?.path).toBe(expectedFamily(point.datum))
      })
      details.forEach((point, index) => {
        expect(point.yValue).toBeCloseTo(radius * 0.78, 12)
        expect(areas[index + families.length]?.path).toBe(
          expectedDetail(point.datum),
        )
      })
    },
  )

  it('uses semantic ring keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstFamilyKeys = familyPoints(first.points).map(({ key }) => key)
    const firstDetailKeys = detailPoints(first.points).map(({ key }) => key)

    expect(familyPoints(repeated.points).map(({ key }) => key)).toEqual(
      firstFamilyKeys,
    )
    expect(detailPoints(repeated.points).map(({ key }) => key)).toEqual(
      firstDetailKeys,
    )
    expect(familyPoints(revised.points).map(({ key }) => key)).toEqual(
      firstFamilyKeys,
    )
    expect(detailPoints(revised.points).map(({ key }) => key)).toEqual(
      firstDetailKeys,
    )
    familyPoints(first.points).forEach((point) =>
      expect(point.key).toContain(point.datum.name),
    )
    detailPoints(first.points).forEach((point) =>
      expect(point.key).toContain(point.datum.name),
    )
  })

  it('keeps allocation in the public definition and family aggregation case-owned', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/96-nested-donut/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain("pie(data.inner, { value: 'size' })")
    expect(source).toContain("pie(data.outer, { value: 'size' })")
    expect(source).toContain('nestedFlareDonut(sourceRows)')
    expect(source).toContain("id: 'family-slices'")
    expect(source).toContain("id: 'detail-slices'")
    expect(source.match(/key: 'name'/g)).toHaveLength(2)
    expect(source.match(/color: 'name'/g)).toHaveLength(2)
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('innerLayout')
    expect(source).not.toContain('outerLayout')
    expect(source).not.toContain('({ data })')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(
    nestedDonutDefinition(nextInput),
    nextInput,
  )
}

function familyPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<FlareDonutSlice>, number, number> =>
      point.markId === 'family-slices',
  )
}

function detailPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<FlareDonutDetail>, number, number> =>
      point.markId === 'detail-slices',
  )
}

function assertCompletePie<TDatum extends FlareDonutSlice>(
  data: readonly PieDatum<TDatum>[],
  source: readonly TDatum[],
) {
  expect(data[0]?.startAngle).toBe(0)
  expect(data.at(-1)?.endAngle).toBe(Math.PI * 2)
  expect(data.reduce((sum, row) => sum + row.fraction, 0)).toBeCloseTo(1)
  const total = source.reduce((sum, row) => sum + row.size, 0)

  data.forEach((row, index) => {
    expect(row.value).toBe(source[index]!.size)
    expect(row.fraction).toBeCloseTo(source[index]!.size / total, 12)
    expect(row).not.toHaveProperty('data')
    expect(row.source).toEqual([source[index]])
    expect(row.sourceIndexes).toEqual([index])
  })
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
