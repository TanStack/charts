import { describe, expect, it } from 'vitest'
import { arrow } from './arrow'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { linearAxes } from './test-scales'
import type { SceneNode } from './types'

describe('arrow mark', () => {
  it('draws one shaft and two fixed-size head segments per datum', () => {
    const data = [
      { id: 'a', x1: 1, y1: 2, x2: 7, y2: 8 },
      { id: 'b', x1: 2, y1: 7, x2: 8, y2: 3 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          arrow(data, {
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
            key: 'id',
            stroke: '#2563eb',
            headLength: 10,
          }),
        ],
        ...linearAxes([0, 10], [0, 10]),
      }),
      { width: 480, height: 260 },
    )
    const nodes = flatten(scene.nodes)
    const shafts = nodes.filter(
      (node) => node.className === 'ts-chart__arrow-shaft',
    )
    const items = nodes.filter(
      (node) => node.className === 'ts-chart__arrow-item',
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Arrows' })

    expect(items).toHaveLength(2)
    expect(shafts).toHaveLength(2)
    expect(
      items.every(
        (node) => node.kind === 'group' && node.children.length === 3,
      ),
    ).toBe(true)
    expect(scene.points.map((point) => point.datum)).toEqual(data)
    expect(svg).toContain('class="ts-chart__arrow-shaft"')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
