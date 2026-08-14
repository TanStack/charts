import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { miserables } from '@charts-poc/demo-data/miserables'
import { describe, expect, it } from 'vitest'
import { networkLayout } from './layout'
import { forceDefinition } from './tanstack'
import { forceNetworkData } from './transform'
import type { ConformanceInput } from '../../types'
import type { ChartPoint, ChartScene, SceneNode } from '@tanstack/charts'

interface ForceNodeDatum {
  readonly id: string
  readonly group: number
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly source: readonly [{ readonly id: string; readonly group: number }]
  readonly sourceIndexes: readonly [number]
}

interface ForceLinkDatum {
  readonly source: string
  readonly target: string
  readonly value: number
  readonly sourceKey: string
  readonly targetKey: string
  readonly sourceIndex: number
  readonly targetIndex: number
  readonly sourceNode: ForceNodeDatum
  readonly targetNode: ForceNodeDatum
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly sourceRows: readonly [
    {
      readonly source: string
      readonly target: string
      readonly value: number
    },
  ]
  readonly sourceIndexes: readonly [number]
}

const size = { width: 640, height: 400 }
const network = forceNetworkData(miserables)

describe('native force-directed network', () => {
  it('renders the selected topology through native marks', () => {
    const scene = render(0)
    const nodes = pointData<ForceNodeDatum>(scene, 'network-nodes')
    const links = pointData<ForceLinkDatum>(scene, 'network-links')
    const labels = pointData<ForceNodeDatum>(scene, 'network-labels')

    expect(nodes).toHaveLength(13)
    expect(links).toHaveLength(15)
    expect(labels).toHaveLength(13)
    expect(markChildren(scene.nodes, 'network-links', 'rule')).toHaveLength(15)
    expect(markChildren(scene.nodes, 'network-nodes', 'dot')).toHaveLength(13)
    expect(markChildren(scene.nodes, 'network-labels', 'label')).toHaveLength(
      13,
    )

    const byId = new Map(nodes.map((node) => [node.id, node]))
    for (const [sourceIndex, node] of nodes.entries()) {
      expect(node).toMatchObject({
        id: network.nodes[sourceIndex]?.id,
        group: network.nodes[sourceIndex]?.group,
        source: [network.nodes[sourceIndex]],
        sourceIndexes: [sourceIndex],
      })
      expect([node.x, node.y, node.vx, node.vy].every(Number.isFinite)).toBe(
        true,
      )
    }

    for (const [sourceIndex, edge] of links.entries()) {
      const raw = network.links[sourceIndex]
      const source = byId.get(edge.source)
      const target = byId.get(edge.target)
      expect(raw).toBeDefined()
      expect(source).toBeDefined()
      expect(target).toBeDefined()
      if (!raw || !source || !target) {
        throw new Error(`Force layout did not resolve link ${sourceIndex}`)
      }
      expect(edge).toMatchObject({
        source: raw.source,
        target: raw.target,
        value: raw.value,
        sourceKey: raw.source,
        targetKey: raw.target,
        sourceRows: [raw],
        sourceIndexes: [sourceIndex],
      })
      expect(edge.sourceIndex).toBe(network.nodes.indexOf(source.source[0]))
      expect(edge.targetIndex).toBe(network.nodes.indexOf(target.source[0]))
      expect(edge.sourceNode).toBe(source)
      expect(edge.targetNode).toBe(target)
      expect([edge.x1, edge.y1, edge.x2, edge.y2].every(Number.isFinite)).toBe(
        true,
      )
      expect([edge.x1, edge.y1]).toEqual([source.x, source.y])
      expect([edge.x2, edge.y2]).toEqual([target.x, target.y])
    }
  })

  it.each([0, 1])(
    'matches the D3 reference simulation for revision %s',
    (revision) => {
      const scene = render(revision)
      const reference = networkLayout(network, revision)
      const nodes = pointData<ForceNodeDatum>(scene, 'network-nodes')
      const links = pointData<ForceLinkDatum>(scene, 'network-links')

      expect(nodes.map(({ id, group, x, y }) => ({ id, group, x, y }))).toEqual(
        reference.nodes,
      )
      expect(
        links.map(({ source, target, value, x1, y1, x2, y2 }) => ({
          source,
          target,
          value,
          x1,
          y1,
          x2,
          y2,
        })),
      ).toEqual(reference.links)
      expect(scene.scales.x?.domain).toEqual(reference.xDomain)
      expect(scene.scales.y?.domain).toEqual(reference.yDomain)
    },
  )

  it('is deterministic per revision while preserving mark identities', () => {
    const first = render(0)
    const repeated = render(0)
    const revised = render(1)

    expect(topologySignature(repeated)).toEqual(topologySignature(first))
    expect(sceneKeys(repeated)).toEqual(sceneKeys(first))
    expect(sceneKeys(revised)).toEqual(sceneKeys(first))
    expect(topologySignature(revised)).not.toEqual(topologySignature(first))
  })

  it('keeps subgraph selection shared and source data immutable', () => {
    const before = JSON.stringify(network)
    render(1)

    expect(network.nodes).toHaveLength(13)
    expect(network.links).toHaveLength(15)
    expect(JSON.stringify(network)).toBe(before)
    expect(
      network.links.every(
        ({ source, target }) =>
          network.nodes.some((node) => node.id === source) &&
          network.nodes.some((node) => node.id === target),
      ),
    ).toBe(true)
  })

  it('does not import the case-owned D3 layout from the TanStack definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/40-force-directed-network/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/network/force'")
    expect(source).not.toMatch(/from ['"]\.\/layout['"]/)
    expect(source).not.toContain('d3-force')
  })
})

function render(revision: number) {
  return createChartRuntime().render(
    forceDefinition({
      ...size,
      revision,
    } satisfies ConformanceInput),
    size,
  )
}

function pointData<TDatum>(scene: ChartScene, markId: string): TDatum[] {
  return scene.points
    .filter((point) => point.markId === markId)
    .map((point) => point.datum as TDatum)
}

function markChildren(
  nodes: readonly SceneNode[],
  key: string,
  kind: SceneNode['kind'],
): SceneNode[] {
  const group = flatten(nodes).find(
    (node) => node.kind === 'group' && node.key === key,
  )
  return group?.kind === 'group'
    ? group.children.filter((node) => node.kind === kind)
    : []
}

function topologySignature(scene: ChartScene) {
  return scene.points.map((point: ChartPoint) => ({
    key: point.key,
    datum: point.datum,
  }))
}

function sceneKeys(scene: ChartScene): string[] {
  return scene.points.map((point) => point.key)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
