import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { basicFlowNodes, basicSankeyData } from './model'
import { basicSankeyDefinition } from './tanstack'
import type { BasicSankeyDatum } from './tanstack'
import type { SceneNode } from '@tanstack/charts'

describe('basic Sankey composition', () => {
  it.each([
    { width: 320, height: 240 },
    { width: 768, height: 500 },
  ])('lays out a minimal flow inside $width×$height', (size) => {
    const input = { ...size, revision: 0 }
    const { links: flowLinks } = basicSankeyData(input.revision)
    const runtime = createChartRuntime<BasicSankeyDatum, number, number>()
    const scene = runtime.render(basicSankeyDefinition(input), size)
    const nodes = flatten(scene.nodes)
    const links = nodes.filter((node) => node.kind === 'polyline' && node.path)
    const rectangles = nodes.filter((node) => node.kind === 'rect')
    const labels = nodes.filter((node) => node.kind === 'label')

    expect(links).toHaveLength(flowLinks.length)
    expect(links.map((link) => link.style?.lineCap)).toEqual(
      Array.from({ length: flowLinks.length }, () => 'butt'),
    )
    expect(new Set(links.map((link) => link.style?.stroke))).toEqual(
      new Set(['currentColor']),
    )
    expect(rectangles).toHaveLength(basicFlowNodes.length)
    expect(labels).toHaveLength(basicFlowNodes.length)
    expect(
      labels.map((label) => (label.kind === 'label' ? label.text : '')),
    ).toEqual(basicFlowNodes.map((node) => node.label))
    expect(
      new Set(
        scene.points
          .filter((point) => point.datum.kind === 'node')
          .map((point) => point.datum.id),
      ),
    ).toEqual(new Set(basicFlowNodes.map((node) => node.id)))

    for (const rectangle of rectangles) {
      if (rectangle.kind !== 'rect') continue
      expect(rectangle.x).toBeGreaterThanOrEqual(0)
      expect(rectangle.y).toBeGreaterThanOrEqual(0)
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(scene.width)
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(scene.height)
    }
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
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
