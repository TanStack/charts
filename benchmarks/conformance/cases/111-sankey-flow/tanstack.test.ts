import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { incomeStatementData } from './model'
import { sankeyDefinition } from './tanstack'
import type { IncomeSankeyDatum } from './tanstack'
import type { SceneNode } from '@tanstack/charts'

describe('Apple income statement Sankey composition', () => {
  it('renders every flow with a flat link cap', () => {
    const input = { width: 768, height: 500, revision: 0 }
    const { links: flowLinks } = incomeStatementData(input.revision)
    const runtime = createChartRuntime<IncomeSankeyDatum, number, number>()
    const scene = runtime.render(sankeyDefinition(input), input)
    const links = flatten(scene.nodes).filter(
      (node) => node.kind === 'polyline' && node.path,
    )

    expect(links).toHaveLength(flowLinks.length)
    expect(links.every((link) => link.style?.lineCap === 'butt')).toBe(true)
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
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
