import { describe, expect, it } from 'vitest'
import { facetChart } from './facet'
import { lineY } from './line'
import { createChartScene } from './scene'
import { renderChartSvg } from './svg'
import type { SceneNode } from './types'

describe('facets', () => {
  it('lays out independently rendered groups and offsets interaction points', () => {
    const data = [
      { id: 'a', group: 'Alpha', x: 0, y: 2 },
      { id: 'b', group: 'Alpha', x: 1, y: 4 },
      { id: 'c', group: 'Beta', x: 0, y: 3 },
      { id: 'd', group: 'Beta', x: 1, y: 6 },
    ]
    const definition = facetChart(data, {
      by: 'group',
      minWidth: 240,
      chart: (group) => ({
        marks: [lineY(group, { x: 'x', y: 'y', key: 'id' })],
        x: { domain: [0, 1] },
        y: { domain: [0, 6] },
      }),
    })
    const scene = createChartScene(definition, { width: 640, height: 260 })
    const facetCells = flatten(scene.nodes).filter((node) =>
      node.key.startsWith('facet-0:string:'),
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Faceted trends' })

    expect(scene.nodes.some((node) => node.key === 'axes')).toBe(false)
    expect(
      facetCells.filter(
        (node) =>
          node.kind === 'group' && node.className === 'ts-chart__facet-cell',
      ),
    ).toHaveLength(2)
    expect(scene.points).toHaveLength(4)
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(4)
    expect(scene.points[2]?.x).toBeGreaterThan(scene.points[0]?.x ?? 0)
    expect(svg).toContain('transform="translate(')
    expect(svg).toContain('Alpha')
    expect(svg).toContain('Beta')
  })

  it('stacks panels when the available width is narrow', () => {
    const data = [
      { group: 'A', value: 1 },
      { group: 'B', value: 2 },
    ]
    const scene = createChartScene(
      facetChart(data, {
        by: 'group',
        minWidth: 220,
        chart: (group) => ({ marks: [lineY(group, { y: 'value' })] }),
      }),
      { width: 360, height: 500 },
    )
    const cells = flatten(scene.nodes).filter(
      (node) =>
        node.kind === 'group' && node.className === 'ts-chart__facet-cell',
    )

    expect(cells).toHaveLength(2)
    if (cells[0]?.kind !== 'group' || cells[1]?.kind !== 'group') {
      throw new Error('Expected facet groups')
    }
    expect(cells[0].translateX).toBe(cells[1].translateX)
    expect(cells[1].translateY).toBeGreaterThan(cells[0].translateY ?? 0)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
