import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { basicFlowLinks, basicFlowNodes } from './data'
import { basicSankeyDefinition } from './tanstack'
import type { BasicFlowNode } from './data'
import type { SceneNode } from '@tanstack/charts'

describe('basic Sankey composition', () => {
  it.each([
    { width: 320, height: 240 },
    { width: 768, height: 500 },
  ])('lays out a minimal flow inside $width×$height', (size) => {
    const runtime = createChartRuntime<BasicFlowNode, string, number>()
    const scene = runtime.render(basicSankeyDefinition(), size)
    const nodes = flatten(scene.nodes)
    const links = nodes.filter((node) => node.kind === 'polyline' && node.path)
    const rectangles = nodes.filter((node) => node.kind === 'rect')
    const labels = nodes.filter((node) => node.kind === 'label')

    expect(links).toHaveLength(basicFlowLinks.length)
    expect(links.map((link) => link.style?.lineCap)).toEqual(
      Array.from({ length: basicFlowLinks.length }, () => 'butt'),
    )
    expect(new Set(links.map((link) => link.style?.stroke))).toEqual(
      new Set(['currentColor']),
    )
    expect(rectangles).toHaveLength(basicFlowNodes.length)
    expect(labels).toHaveLength(basicFlowNodes.length)
    expect(
      labels.map((label) => (label.kind === 'label' ? label.text : '')),
    ).toEqual(basicFlowNodes.map((node) => node.label))
    expect(scene.points.map((point) => point.datum.id)).toEqual(
      basicFlowNodes.map((node) => node.id),
    )

    for (const rectangle of rectangles) {
      if (rectangle.kind !== 'rect') continue
      expect(rectangle.x).toBeGreaterThanOrEqual(0)
      expect(rectangle.y).toBeGreaterThanOrEqual(0)
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(scene.width)
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(scene.height)
    }
  })

  it('conserves value through both paths', () => {
    for (const node of basicFlowNodes) {
      const incoming = basicFlowLinks
        .filter((link) => link.target === node.id)
        .reduce((total, link) => total + link.value, 0)
      const outgoing = basicFlowLinks
        .filter((link) => link.source === node.id)
        .reduce((total, link) => total + link.value, 0)

      if (incoming > 0 && outgoing > 0) {
        expect(incoming).toBe(outgoing)
      }
    }
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
