import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import {
  incomeStatementData,
  incomeStatementTitle,
  incomeStatementValueRanges,
  leafFlowNodeIds,
  linkColors,
} from './model'
import { sankeyDefinition } from './tanstack'
import type { FlowNode } from './model'
import type { SceneNode } from '@tanstack/charts'

describe('Apple income statement Sankey composition', () => {
  it.each([
    { width: 320, height: 240, revision: 0 },
    { width: 768, height: 500, revision: 1 },
  ])('lays out every node and link inside $width×$height', (input) => {
    const { nodes: flowNodes, links: flowLinks } = incomeStatementData(
      input.revision,
    )
    const runtime = createChartRuntime<FlowNode, string, number>()
    const scene = runtime.render(sankeyDefinition(input), input)
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

  it.each([0, 1, 2, 7])(
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

  it('retains the supplied FY22 values at revision zero', () => {
    expect(
      incomeStatementData(0).nodes.map((node) => [node.id, node.displayValue]),
    ).toEqual([
      ['iphone', '$205.5B'],
      ['macbook', '$40.2B'],
      ['ipad', '$29.3B'],
      ['wearables', '$41.2B'],
      ['products', '$316.2B'],
      ['services', '$78.2B'],
      ['revenue', '$394.3B'],
      ['gross-profit', '$170.9B'],
      ['cost-of-revenue', '$223.5B'],
      ['operating-profit', '$119.5B'],
      ['operating-expenses', '$51.4B'],
      ['product-costs', '$201.4B'],
      ['service-costs', '$22.1B'],
      ['net-profit', '$99.8B'],
      ['tax', '$19.3B'],
      ['other', '$0.3B'],
      ['research-development', '$26.3B'],
      ['selling-general-administrative', '$25.1B'],
    ])
  })

  it('updates every leaf inside its declared range', () => {
    const initial = incomeStatementData(0)
    const updated = incomeStatementData(1)
    const repeated = incomeStatementData(1)
    const initialValues = new Map(
      initial.nodes.map((node) => [node.id, node.value]),
    )
    const updatedValues = new Map(
      updated.nodes.map((node) => [node.id, node.value]),
    )

    expect(repeated).toEqual(updated)
    for (const id of leafFlowNodeIds) {
      const range = incomeStatementValueRanges[id]
      expect(updatedValues.get(id)).toBeGreaterThanOrEqual(range.min)
      expect(updatedValues.get(id)).toBeLessThanOrEqual(range.max)
      expect(updatedValues.get(id)).not.toBe(initialValues.get(id))
    }
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
