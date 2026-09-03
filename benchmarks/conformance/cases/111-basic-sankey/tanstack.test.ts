import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { basicFlowNodes, basicSankeyData } from './model'
import { createExampleChart } from './tanstack'
import type {
  BasicSankeyDatum,
  BasicSankeyLinkRow,
  BasicSankeyNodeRow,
} from './tanstack'
import type {
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  SceneNode,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const baseInput = {
  width: 320,
  height: 240,
  revision: 0,
} satisfies ConformanceInput

describe('basic Sankey composition', () => {
  it.each([
    { width: 320, height: 240 },
    { width: 768, height: 500 },
  ])(
    'renders native flows, nodes, and labels inside responsive bounds at $width×$height',
    (size) => {
      const input = { ...baseInput, ...size }
      const { links: flowLinks } = basicSankeyData(input.revision)
      const scene = render(input)
      const points = scene.points
      const links = markPoints<BasicSankeyLinkRow>(scene, 'basic-sankey:links')
      const nodes = markPoints<BasicSankeyNodeRow>(scene, 'basic-sankey:nodes')
      const labels = markPoints<BasicSankeyNodeRow>(
        scene,
        'basic-sankey:labels',
      )
      const polylines = sceneNodes(scene.nodes, 'polyline')
      const rectangles = sceneNodes(scene.nodes, 'rect')
      const sceneLabels = sceneNodes(scene.nodes, 'label')
      const bounds = basicBounds(size)

      expect(links).toHaveLength(flowLinks.length)
      expect(nodes).toHaveLength(basicFlowNodes.length)
      expect(labels).toHaveLength(basicFlowNodes.length)
      expect(points).toHaveLength(flowLinks.length + basicFlowNodes.length * 2)
      expect(new Set(points.map(({ key }) => key)).size).toBe(points.length)
      expect(polylines).toHaveLength(flowLinks.length)
      expect(rectangles).toHaveLength(basicFlowNodes.length)
      expect(sceneLabels).toHaveLength(basicFlowNodes.length)
      expect(scene.scales.x.type).toBe('none')
      expect(scene.scales.y.type).toBe('none')

      expect(polylines.map(({ style }) => style?.lineCap)).toEqual(
        flowLinks.map(() => 'butt'),
      )
      expect(polylines.map(({ style }) => style?.stroke)).toEqual(
        flowLinks.map(() => 'currentColor'),
      )
      expect(polylines.map(({ style }) => style?.strokeOpacity)).toEqual(
        flowLinks.map(() => 0.35),
      )
      expect(rectangles.map(({ style }) => style?.fill)).toEqual(
        basicFlowNodes.map(() => 'currentColor'),
      )
      expect(rectangles.map(({ style }) => style?.fillOpacity)).toEqual(
        basicFlowNodes.map(() => 0.72),
      )
      expect(sceneLabels.map(({ text }) => text)).toEqual(
        basicFlowNodes.map(({ label }) => label),
      )
      expect(sceneLabels.map(({ anchor }) => anchor)).toEqual([
        'end',
        'start',
        'start',
        'start',
      ])

      for (const { datum } of nodes) {
        expect(datum.x0).toBeGreaterThanOrEqual(bounds.left - 1e-9)
        expect(datum.x1).toBeLessThanOrEqual(size.width - bounds.right + 1e-9)
        expect(datum.y0).toBeGreaterThanOrEqual(bounds.top - 1e-9)
        expect(datum.y1).toBeLessThanOrEqual(size.height - bounds.bottom + 1e-9)
        expect(datum.x1 - datum.x0).toBeCloseTo(bounds.nodeWidth, 12)
      }
    },
  )

  it('uses the full source topology without labels in the catalog preview', () => {
    const input = {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    } satisfies ConformanceInput
    const expected = basicSankeyData(input.revision)
    const scene = render(input)
    const links = markPoints<BasicSankeyLinkRow>(scene, 'basic-sankey:links')
    const nodes = markPoints<BasicSankeyNodeRow>(scene, 'basic-sankey:nodes')

    expect(links.map(({ datum }) => datum.data)).toEqual(expected.links)
    expect(nodes.map(({ datum }) => datum.data)).toEqual(expected.nodes)
    expect(sceneNodes(scene.nodes, 'label')).toHaveLength(0)
    for (const { datum } of nodes) {
      expect(datum.x0).toBeGreaterThanOrEqual(4 - 1e-9)
      expect(datum.x1).toBeLessThanOrEqual(input.width - 4 + 1e-9)
      expect(datum.y0).toBeGreaterThanOrEqual(4 - 1e-9)
      expect(datum.y1).toBeLessThanOrEqual(input.height - 4 + 1e-9)
      expect(datum.x1 - datum.x0).toBeCloseTo(8, 12)
    }
  })

  it('retains raw rows, exact lineage, and resolved endpoint identity', () => {
    const scene = render(baseInput)
    const nodes = markPoints<BasicSankeyNodeRow>(
      scene,
      'basic-sankey:nodes',
    ).map(({ datum }) => datum)
    const links = markPoints<BasicSankeyLinkRow>(
      scene,
      'basic-sankey:links',
    ).map(({ datum }) => datum)
    const expectedLinks = basicSankeyData(0).links
    const nodeByKey = new Map(nodes.map((node) => [node.key, node]))

    nodes.forEach((node, index) => {
      expect(node.data).toBe(basicFlowNodes[index])
      expect(node.source).toEqual([node.data])
      expect(node.source[0]).toBe(node.data)
      expect(node.sourceIndexes).toEqual([index])
    })

    links.forEach((flow, index) => {
      expect(flow.data).toEqual(expectedLinks[index])
      expect(flow.sourceRows).toEqual([flow.data])
      expect(flow.sourceRows[0]).toBe(flow.data)
      expect(flow.sourceIndexes).toEqual([index])
      expect(flow.sourceNode).toBe(nodeByKey.get(flow.source))
      expect(flow.targetNode).toBe(nodeByKey.get(flow.target))
      expect(flow.sourceIndex).toBe(flow.sourceNode.index)
      expect(flow.targetIndex).toBe(flow.targetNode.index)
    })
  })

  it('keeps semantic keys while revisions change only flow values', () => {
    const runtime = createChartRuntime<BasicSankeyDatum, number, number>()
    const renderRevision = (revision: number) => {
      const input = { ...baseInput, revision }
      return runtime.render(createExampleChart(input), input)
    }
    const first = renderRevision(0)
    const repeated = renderRevision(0)
    const revised = renderRevision(1)
    const firstKeys = first.points.map(({ key }) => key)
    const linkValues = (scene: typeof first) =>
      markPoints<BasicSankeyLinkRow>(scene, 'basic-sankey:links').map(
        ({ datum }) => datum.value,
      )

    expect(repeated.points.map(({ key }) => key)).toEqual(firstKeys)
    expect(revised.points.map(({ key }) => key)).toEqual(firstKeys)
    expect(linkValues(repeated)).toEqual(linkValues(first))
    expect(linkValues(revised)).not.toEqual(linkValues(first))
  })

  it('updates the split while conserving a total of 10', () => {
    const pathAValues = [0, 1, 2, 3, 4].map((revision) => {
      const { links } = basicSankeyData(revision)

      for (const node of basicFlowNodes) {
        const incoming = links
          .filter((link) => link.target === node.id)
          .reduce((total, link) => total + link.value, 0)
        const outgoing = links
          .filter((link) => link.source === node.id)
          .reduce((total, link) => total + link.value, 0)

        if (incoming > 0 && outgoing > 0) {
          expect(incoming).toBe(outgoing)
        }
      }

      expect(
        links
          .filter((link) => link.source === 'input')
          .reduce((total, link) => total + link.value, 0),
      ).toBe(10)

      return links.find(
        (link) => link.source === 'input' && link.target === 'path-a',
      )?.value
    })

    expect(pathAValues).toEqual([6, 7, 5, 3, 4])
  })

  it('keeps graph allocation in the first-party Sankey mark', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/111-basic-sankey/example.tsx',
      ),
      'utf8',
    )
    type Datum = ChartSpecDatum<ReturnType<typeof createExampleChart>>

    expectTypeOf<Datum>().toEqualTypeOf<BasicSankeyDatum>()
    expect(source).toContain("from '@tanstack/charts/network/sankey'")
    expect(source).toContain('sankeyDiagram({')
    expect(source).toContain('nodes: sankeyNodes')
    expect(source).toContain('links: sankeyLinks')
    expect(source).toContain("key: 'key'")
    expect(source).not.toContain("from 'd3-sankey'")
    expect(source).not.toContain("from 'd3-scale'")
    expect(source).not.toMatch(/from ['"]\.\/layout['"]/u)
    expect(source).not.toMatch(/\bsankey\s*\(/u)
    expect(source).not.toContain('sankeyLayout')
    expect(source).not.toContain('responsiveLayout')
    expect(source).not.toContain('cloneGraph')
    expect(source).not.toContain('resolveEndpoint')
    expect(source).not.toContain('interface BasicSankeyNodeRow')
    expect(source).not.toContain('interface BasicSankeyLinkRow')
  })
})

function render(input: ConformanceInput) {
  return createChartRuntime<BasicSankeyDatum, number, number>().render(
    createExampleChart(input),
    input,
  )
}

function markPoints<TDatum>(
  scene: ChartScene,
  markId: string,
): ChartPoint<TDatum>[] {
  return scene.points.filter(
    (point): point is ChartPoint<TDatum> => point.markId === markId,
  )
}

function sceneNodes<TKind extends SceneNode['kind']>(
  nodes: readonly SceneNode[],
  kind: TKind,
): Extract<SceneNode, { kind: TKind }>[] {
  return flatten(nodes).filter(
    (node): node is Extract<SceneNode, { kind: TKind }> => node.kind === kind,
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function basicBounds(size: {
  readonly width: number
  readonly height: number
}) {
  return {
    left: clamp(size.width * 0.14, 48, 82),
    right: clamp(size.width * 0.14, 48, 82),
    top: clamp(size.height * 0.1, 18, 32),
    bottom: clamp(size.height * 0.1, 18, 32),
    nodeWidth: clamp(size.width * 0.025, 10, 18),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
