import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flare } from '@tanstack/charts-data/flare'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { selectSunburstData } from './selection'
import { createExampleChart } from './tanstack'
import type { SunburstNode } from '@tanstack/charts/hierarchy/sunburst'
import type { FlareRow } from '@tanstack/charts-data/flare'
import type {
  ChartPoint,
  ChartScene,
  SceneArea,
  SceneNode,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const colors = ['#7c3aed', '#0ea5e9']

describe('native responsive sunburst', () => {
  it.each([0, 1])(
    'builds revision %s directly from flat source rows with honest lineage',
    (revision) => {
      const selected = selectSunburstData(flare, revision)
      const scene = render({ ...input, revision })
      const points = sunburstPoints(scene)
      const nodes = points.map(({ datum }) => datum)
      const byId = new Map(nodes.map((node) => [node.id, node]))

      expect(points).toHaveLength(10)
      expect(sunburstAreas(scene)).toHaveLength(10)
      expect(byId.has(canonicalId(selected[0]!.name))).toBe(false)
      expect(new Set(nodes.map(({ id }) => id))).toEqual(
        new Set(selected.slice(1).map(({ name }) => canonicalId(name))),
      )

      for (const node of nodes) {
        const sourceIndex = selected.indexOf(node.data!)
        expect(sourceIndex).toBeGreaterThan(0)
        expect(node.id).toBe(canonicalId(node.data!.name))
        expect(node.name).toBe(node.id.slice(node.id.lastIndexOf('/') + 1))
        expect(node.source).toEqual([node.data])
        expect(node.source[0]).toBe(node.data)
        expect(node.sourceIndexes).toEqual([sourceIndex])
        expect(node.internal).toBe(!node.external)
        expect(node.branchId).toBe(
          branchId(canonicalId(selected[0]!.name), node.id),
        )
        expect(node.value).toBe(aggregateValue(selected, node.id))
        expect(node.parentId).toBe(node.id.slice(0, node.id.lastIndexOf('/')))
        expect(node.ancestorIds.at(-1)).toBe(node.parentId)
      }

      const branchColors = new Map<string | null, string | undefined>()
      for (const point of points) {
        expect(point.datum.branchId).not.toBeNull()
        const existing = branchColors.get(point.datum.branchId)
        if (existing === undefined) {
          branchColors.set(point.datum.branchId, point.color)
        } else {
          expect(point.color).toBe(existing)
        }
      }
      expect([...branchColors.values()]).toEqual(colors)
    },
  )

  it.each([
    { width: 640, height: 400 },
    { width: 320, height: 240 },
  ])(
    'preserves the reference depth allocation with a fixed 2px ring gap at $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const scene = render(nextInput)
      const areas = sunburstAreas(scene)
      const radius = (Math.min(width, height) * 0.88) / 2
      const innerRadius = radius * 0.14
      const outerRadius = innerRadius + ((radius - innerRadius) * 2) / 3 + 2
      const rootRing = areas.filter(
        (area) => area.interaction?.point.datum.depth === 1,
      )
      const leafRing = areas.filter(
        (area) => area.interaction?.point.datum.depth === 2,
      )
      const rootExtents = rootRing.map(radialExtent)
      const leafExtents = leafRing.map(radialExtent)

      expect(rootRing).toHaveLength(2)
      expect(leafRing).toHaveLength(8)
      rootExtents.forEach(({ minimum }) =>
        expect(minimum).toBeCloseTo(innerRadius, 8),
      )
      leafExtents.forEach(({ maximum }) =>
        expect(maximum).toBeCloseTo(outerRadius, 8),
      )
      expect(leafExtents[0]!.minimum - rootExtents[0]!.maximum).toBeCloseTo(
        2,
        8,
      )

      for (const point of sunburstPoints(scene)) {
        const distance = Math.hypot(point.x - width / 2, point.y - height / 2)
        const extent = radialExtent(
          areas.find((area) => area.key === point.key)!,
        )
        expect(distance).toBeCloseTo((extent.minimum + extent.maximum) / 2, 8)
      }
    },
  )

  it('keeps the reference orientation and attaches focus to sector geometry', () => {
    const scene = render(input)
    const points = sunburstPoints(scene)
    const cluster = points.find(
      ({ datum }) => datum.id === '/flare/analytics/cluster',
    )
    const graph = points.find(
      ({ datum }) => datum.id === '/flare/analytics/graph',
    )

    expect(cluster?.x).toBeGreaterThan(input.width / 2)
    expect(cluster?.y).toBeLessThan(input.height / 2)
    expect(graph?.x).toBeLessThan(input.width / 2)
    expect(graph?.y).toBeGreaterThan(input.height / 2)

    for (const area of sunburstAreas(scene)) {
      const point = points.find(({ key }) => key === area.key)
      expect(area.interaction?.point).toBe(point)
      expect(area.interaction?.affinity).toBe('geometry')
      expect(area.points.length).toBeGreaterThan(3)
      expect(area.path).toMatch(/^M/)
    }
  })

  it('keeps node keys stable across rerenders and source revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstById = keyById(first)
    const repeatedById = keyById(repeated)
    const revisedById = keyById(revised)

    expect(repeatedById).toEqual(firstById)
    for (const [id, key] of firstById) {
      if (revisedById.has(id)) expect(revisedById.get(id)).toBe(key)
      expect(key).toContain(id)
    }
    expect(
      revisedById.has('/flare/analytics/graph/BetweennessCentrality'),
    ).toBe(false)
    expect(revisedById.has('/flare/analytics/graph/SpanningTree')).toBe(true)
  })

  it('leaves selected source rows unchanged', () => {
    const selected = selectSunburstData(flare, 1)
    const before = JSON.stringify(selected)

    render({ ...input, revision: 1 })

    expect(JSON.stringify(selected)).toBe(before)
    expect(selected.every((row) => flare.includes(row))).toBe(true)
  })

  it('keeps only selection and semantic accessors outside the hierarchy mark', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/101-sunburst/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/hierarchy/sunburst'")
    expect(source).toContain('sunburst(data, {')
    expect(source).toContain("path: 'name'")
    expect(source).toContain("delimiter: '.'")
    expect(source).toContain("value: 'size'")
    expect(source).toContain("color: 'branchId'")
    expect(source).toContain('ringPadding: 2')
    expect(source).toContain('startAngle: Math.PI / 2')
    expect(source).toContain('endAngle: Math.PI / 2 - Math.PI * 2')
    expect(source).toContain('outerRadius: ({ radius }) =>')
    expect(source).not.toContain("from 'd3-hierarchy'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/)
    expect(source).not.toContain('partition(')
    expect(source).not.toContain('generator:')
    expect(source).not.toContain('SunburstArcDatum')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function sunburstPoints(
  scene: ChartScene,
): ChartPoint<SunburstNode<FlareRow>, number, number>[] {
  return scene.points.filter(
    (point) => point.markId === 'sunburst-arcs',
  ) as ChartPoint<SunburstNode<FlareRow>, number, number>[]
}

function sunburstAreas(scene: ChartScene) {
  return flatten(scene.nodes).filter(
    (
      node,
    ): node is SceneArea & {
      interaction: {
        point: ChartPoint<SunburstNode<FlareRow>, number, number>
        affinity: 'geometry'
      }
    } => node.kind === 'area' && node.interaction !== undefined,
  )
}

function radialExtent(area: SceneArea) {
  const distances = area.points.map(([x, y]) => Math.hypot(x, y))
  return {
    minimum: Math.min(...distances),
    maximum: Math.max(...distances),
  }
}

function branchId(rootId: string, nodeId: string) {
  const suffix = nodeId.slice(rootId.length + 1)
  const delimiter = suffix.indexOf('/')
  return `${rootId}/${delimiter === -1 ? suffix : suffix.slice(0, delimiter)}`
}

function aggregateValue(rows: readonly FlareRow[], nodeId: string) {
  return rows.reduce(
    (sum, row) =>
      canonicalId(row.name) === nodeId ||
      canonicalId(row.name).startsWith(`${nodeId}/`)
        ? sum + (row.size ?? 0)
        : sum,
    0,
  )
}

function canonicalId(path: string) {
  return `/${path.replaceAll('.', '/')}`
}

function keyById(scene: ChartScene) {
  return new Map(sunburstPoints(scene).map(({ datum, key }) => [datum.id, key]))
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
