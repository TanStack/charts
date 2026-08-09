import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  incomeStatementData,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './model'
import { sankeyDefinition } from './tanstack'
import type {
  IncomeSankeyDatum,
  IncomeSankeyLinkRow,
  IncomeSankeyNodeRow,
} from './tanstack'
import type {
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  SceneNode,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const baseInput = {
  width: 768,
  height: 500,
  revision: 0,
} satisfies ConformanceInput

describe('Apple income statement Sankey composition', () => {
  it.each([
    { width: 640, height: 400 },
    { width: 768, height: 500 },
  ])(
    'renders responsive native flows with case-owned presentation at $width×$height',
    (size) => {
      const input = { ...baseInput, ...size }
      const data = incomeStatementData(input.revision)
      const scene = render(input)
      const links = markPoints<IncomeSankeyLinkRow>(
        scene,
        'income-sankey:links',
      )
      const nodes = markPoints<IncomeSankeyNodeRow>(
        scene,
        'income-sankey:nodes',
      )
      const backdrops = markPoints<IncomeSankeyNodeRow>(
        scene,
        'income-sankey:label-backdrops',
      )
      const namePoints = markPoints<IncomeSankeyNodeRow>(
        scene,
        'income-sankey:label-names',
      )
      const valuePoints = markPoints<IncomeSankeyNodeRow>(
        scene,
        'income-sankey:label-values',
      )
      const polylines = sceneNodes(scene.nodes, 'polyline')
      const rectangles = sceneNodes(scene.nodes, 'rect')
      const labels = sceneNodes(scene.nodes, 'label')
      const nodeRectangles = rectangles.filter(({ key }) =>
        key.startsWith('income-sankey:nodes:'),
      )
      const backdropRectangles = rectangles.filter(({ key }) =>
        key.startsWith('income-sankey:label-backdrops:'),
      )
      const nameLabels = labels.filter(({ key }) =>
        key.startsWith('income-sankey:label-names:'),
      )
      const valueLabels = labels.filter(({ key }) =>
        key.startsWith('income-sankey:label-values:'),
      )
      const titleLabels = labels.filter(({ key }) =>
        key.startsWith('income-sankey:title:'),
      )
      const backdropCount = data.nodes.filter(
        ({ labelBackdrop }) => labelBackdrop,
      ).length
      const bounds = incomeBounds(size)

      expect(links).toHaveLength(data.links.length)
      expect(nodes).toHaveLength(data.nodes.length)
      expect(backdrops).toHaveLength(backdropCount)
      expect(namePoints).toHaveLength(data.nodes.length)
      expect(valuePoints).toHaveLength(data.nodes.length)
      expect(scene.points).toHaveLength(
        data.links.length + data.nodes.length * 3 + backdropCount + 1,
      )
      expect(new Set(scene.points.map(({ key }) => key)).size).toBe(
        scene.points.length,
      )
      expect(polylines).toHaveLength(data.links.length)
      expect(nodeRectangles).toHaveLength(data.nodes.length)
      expect(backdropRectangles).toHaveLength(backdropCount)
      expect(nameLabels).toHaveLength(data.nodes.length)
      expect(valueLabels).toHaveLength(data.nodes.length)
      expect(titleLabels).toHaveLength(1)
      expect(scene.scales.x.type).toBe('none')
      expect(scene.scales.y.type).toBe('none')

      expect(polylines.map(({ style }) => style?.lineCap)).toEqual(
        data.links.map(() => 'butt'),
      )
      expect(polylines.map(({ style }) => style?.stroke)).toEqual(
        data.links.map(({ tone }) => linkColors[tone]),
      )
      expect(polylines.map(({ style }) => style?.strokeOpacity)).toEqual(
        data.links.map(({ tone }) => (tone === 'Neutral' ? 0.58 : 0.64)),
      )
      expect(nodeRectangles.map(({ style }) => style?.fill)).toEqual(
        data.nodes.map(({ tone }) => toneColors[tone]),
      )
      expect(
        backdropRectangles.every(
          ({ style }) =>
            style?.fill === 'var(--panel, #ffffff)' &&
            style.fillOpacity === 0.82,
        ),
      ).toBe(true)
      expect(nameLabels.map(({ text }) => text)).toEqual(
        data.nodes.map(({ compactLabel, label }) =>
          size.width < 720 && compactLabel ? compactLabel : label,
        ),
      )
      expect(valueLabels.map(({ text }) => text)).toEqual(
        data.nodes.map(({ displayValue }) => displayValue),
      )
      expect(nameLabels.map(({ anchor }) => anchor)).toEqual(
        data.nodes.map(({ labelSide }) =>
          labelSide === 'right' ? 'start' : 'end',
        ),
      )
      expect(titleLabels[0]).toMatchObject({
        text: incomeStatementTitle,
        anchor: 'middle',
        style: { fill: '#155477' },
      })

      for (const { datum } of nodes) {
        expect(datum.x0).toBeGreaterThanOrEqual(bounds.left - 1e-9)
        expect(datum.x1).toBeLessThanOrEqual(size.width - bounds.right + 1e-9)
        expect(datum.y0).toBeGreaterThanOrEqual(bounds.top - 1e-9)
        expect(datum.y1).toBeLessThanOrEqual(size.height - bounds.bottom + 1e-9)
        expect(datum.x1 - datum.x0).toBeCloseTo(bounds.nodeWidth, 12)
      }
    },
  )

  it('renders the full source topology without label chrome in the catalog preview', () => {
    const input = {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    } satisfies ConformanceInput
    const expected = incomeStatementData(input.revision)
    const scene = render(input)
    const nodes = markPoints<IncomeSankeyNodeRow>(scene, 'income-sankey:nodes')
    const links = markPoints<IncomeSankeyLinkRow>(scene, 'income-sankey:links')
    const rectangles = sceneNodes(scene.nodes, 'rect')
    const labels = sceneNodes(scene.nodes, 'label')
    const nodeRectangles = rectangles.filter(({ key }) =>
      key.startsWith('income-sankey:nodes:'),
    )

    expect(nodes.map(({ datum }) => datum.data.id)).toEqual(
      expected.nodes.map(({ id }) => id),
    )
    expect(
      links.map(({ datum }) => [datum.data.source, datum.data.target]),
    ).toEqual(expected.links.map(({ source, target }) => [source, target]))
    expect(nodeRectangles.map(({ style }) => style?.fill)).toEqual(
      expected.nodes.map(({ tone }) => toneColors[tone]),
    )
    expect(
      sceneNodes(scene.nodes, 'polyline').map(({ style }) => style?.stroke),
    ).toEqual(expected.links.map(({ tone }) => linkColors[tone]))
    expect(labels).toHaveLength(0)

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
    const expected = incomeStatementData(0)
    const nodes = markPoints<IncomeSankeyNodeRow>(
      scene,
      'income-sankey:nodes',
    ).map(({ datum }) => datum)
    const links = markPoints<IncomeSankeyLinkRow>(
      scene,
      'income-sankey:links',
    ).map(({ datum }) => datum)
    const nodeByKey = new Map(nodes.map((node) => [node.key, node]))

    nodes.forEach((node, index) => {
      expect(node.data).toEqual(expected.nodes[index])
      expect(node.source).toEqual([node.data])
      expect(node.source[0]).toBe(node.data)
      expect(node.sourceIndexes).toEqual([index])
    })

    links.forEach((flow, index) => {
      expect(flow.data).toEqual(expected.links[index])
      expect(flow.sourceRows).toEqual([flow.data])
      expect(flow.sourceRows[0]).toBe(flow.data)
      expect(flow.sourceIndexes).toEqual([index])
      expect(flow.sourceNode).toBe(nodeByKey.get(flow.source))
      expect(flow.targetNode).toBe(nodeByKey.get(flow.target))
      expect(flow.sourceIndex).toBe(flow.sourceNode.index)
      expect(flow.targetIndex).toBe(flow.targetNode.index)
    })
  })

  it('keeps semantic keys while revisions change values and display labels', () => {
    const runtime = createChartRuntime<IncomeSankeyDatum, number, number>()
    const renderRevision = (revision: number) => {
      const input = { ...baseInput, revision }
      return runtime.render(sankeyDefinition(input), input)
    }
    const first = renderRevision(0)
    const repeated = renderRevision(0)
    const revised = renderRevision(1)
    const firstKeys = first.points.map(({ key }) => key)
    const nodeRows = (scene: typeof first) =>
      markPoints<IncomeSankeyNodeRow>(scene, 'income-sankey:nodes').map(
        ({ datum }) => datum,
      )
    const linkRows = (scene: typeof first) =>
      markPoints<IncomeSankeyLinkRow>(scene, 'income-sankey:links').map(
        ({ datum }) => datum,
      )

    expect(repeated.points.map(({ key }) => key)).toEqual(firstKeys)
    expect(revised.points.map(({ key }) => key)).toEqual(firstKeys)
    expect(linkRows(repeated).map(({ value }) => value)).toEqual(
      linkRows(first).map(({ value }) => value),
    )
    expect(linkRows(revised).map(({ value }) => value)).not.toEqual(
      linkRows(first).map(({ value }) => value),
    )
    expect(nodeRows(revised).map(({ data }) => data.displayValue)).not.toEqual(
      nodeRows(first).map(({ data }) => data.displayValue),
    )
  })

  it.each([0, 1])(
    'conserves every intermediate subtotal at revision %s',
    (revision) => {
      const { nodes, links } = incomeStatementData(revision)

      for (const node of nodes) {
        const incoming = links
          .filter((link) => link.target === node.id)
          .reduce((total, link) => total + link.value, 0)
        const outgoing = links
          .filter((link) => link.source === node.id)
          .reduce((total, link) => total + link.value, 0)

        if (incoming > 0 && outgoing > 0) {
          expect(incoming).toBeCloseTo(outgoing, 6)
        }
      }
    },
  )

  it('keeps allocation in the first-party mark and custom work in labels', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/111-sankey-flow/tanstack.ts',
      ),
      'utf8',
    )
    type Datum = ChartSpecDatum<ReturnType<typeof sankeyDefinition>>

    expectTypeOf<Datum>().toMatchTypeOf<IncomeSankeyDatum>()
    expect(source).toContain("from '@tanstack/charts/network/sankey'")
    expect(source).toContain('sankeyDiagram({')
    expect(source).toContain('nodes: sankeyNodes')
    expect(source).toContain('links: sankeyLinks')
    expect(source).toContain('const labelRows = sankeyNodes.map')
    expect(source).toContain('labelBackdropBounds({')
    expect(source).not.toContain("from 'd3-sankey'")
    expect(source).not.toContain("from 'd3-scale'")
    expect(source).not.toMatch(/\bsankey\s*\(/u)
    expect(source).not.toContain('sankeyLayout')
    expect(source).not.toContain('responsiveLayout')
    expect(source).not.toContain('cloneGraph')
    expect(source).not.toContain('resolveEndpoint')
    expect(source).not.toContain('interface IncomeSankeyNodeRow')
    expect(source).not.toContain('interface IncomeSankeyLinkRow')
  })
})

function render(input: ConformanceInput) {
  return createChartRuntime<IncomeSankeyDatum, number, number>().render(
    sankeyDefinition(input),
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

function incomeBounds(size: {
  readonly width: number
  readonly height: number
}) {
  return {
    left: clamp(size.width * 0.15, 56, 122),
    right: clamp(size.width * 0.13, 48, 105),
    top: clamp(size.height * 0.14, 38, 70),
    bottom: clamp(size.height * 0.025, 8, 14),
    nodeWidth: clamp(size.width * 0.032, 10, 24),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
