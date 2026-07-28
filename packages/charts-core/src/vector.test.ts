import { describe, expect, it } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { linearAxes } from './test-scales'
import { vector } from './vector'
import type { SceneNode, SceneRule } from './types'

describe('vector mark', () => {
  it('draws fixed-pixel vectors around their scaled anchors', () => {
    const rows = [
      { id: 'north', x: 5, y: 5, length: 20, direction: 0 },
      { id: 'east', x: 7, y: 7, length: 12, direction: 90 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          vector(rows, {
            x: 'x',
            y: 'y',
            length: 'length',
            rotate: 'direction',
            key: 'id',
            stroke: '#2563eb',
          }),
        ],
        ...linearAxes([0, 10], [0, 10]),
      }),
      { width: 480, height: 260 },
    )
    const nodes = flatten(scene.nodes)
    const shafts = nodes.filter(
      (node): node is SceneRule =>
        node.kind === 'rule' && node.className === 'ts-chart__arrow-shaft',
    )

    expect(shafts).toHaveLength(2)
    expect(Math.abs(shafts[0]!.y2 - shafts[0]!.y1)).toBeCloseTo(20)
    expect(Math.abs(shafts[1]!.x2 - shafts[1]!.x1)).toBeCloseTo(12)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
