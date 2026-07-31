import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { flowLinks, flowNodes, incomeStatementTitle, linkColors } from './data'
import { sankeyDefinition } from './tanstack'
import type { FlowNode } from './data'
import type { SceneNode } from '@tanstack/charts'

describe('Apple income statement Sankey composition', () => {
  it.each([
    { width: 320, height: 240 },
    { width: 768, height: 500 },
  ])('lays out every node and link inside $width×$height', (size) => {
    const runtime = createChartRuntime<FlowNode, string, number>()
    const scene = runtime.render(sankeyDefinition(), size)
    const nodes = flatten(scene.nodes)
    const links = nodes.filter((node) => node.kind === 'polyline' && node.path)
    const rectangles = nodes.filter((node) => node.kind === 'rect')
    const labels = nodes.filter((node) => node.kind === 'label')
    const labelBackdropCount = flowNodes.filter(
      (node) => node.labelBackdrop,
    ).length

    expect(links).toHaveLength(flowLinks.length)
    expect(links.map((link) => link.style?.lineCap)).toEqual(
      Array.from({ length: flowLinks.length }, () => 'butt'),
    )
    expect(new Set(links.map((link) => link.style?.stroke))).toEqual(
      new Set(Object.values(linkColors)),
    )
    expect(rectangles).toHaveLength(flowNodes.length + labelBackdropCount)
    expect(labels).toHaveLength(flowNodes.length * 2 + 1)
    expect(
      labels.some(
        (label) =>
          label.kind === 'label' && label.text === incomeStatementTitle,
      ),
    ).toBe(true)
    expect(scene.points.map((point) => point.datum.id)).toEqual(
      flowNodes.map((node) => node.id),
    )

    for (const rectangle of rectangles) {
      if (rectangle.kind !== 'rect') continue
      expect(rectangle.x).toBeGreaterThanOrEqual(0)
      expect(rectangle.y).toBeGreaterThanOrEqual(0)
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(scene.width)
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(scene.height)
    }
  })

  it('conserves value through every intermediate subtotal', () => {
    for (const node of flowNodes) {
      const incoming = flowLinks
        .filter((link) => link.target === node.id)
        .reduce((total, link) => total + link.value, 0)
      const outgoing = flowLinks
        .filter((link) => link.source === node.id)
        .reduce((total, link) => total + link.value, 0)

      if (incoming > 0 && outgoing > 0) {
        expect(incoming).toBeCloseTo(outgoing, 6)
      }
    }
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
