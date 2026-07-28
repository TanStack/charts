import { describe, expect, it, vi } from 'vitest'
import { hexagon } from './hexagon'
import { createChartScene, defineChart } from './scene'
import { linearAxes } from './test-scales'
import type { SceneArea, SceneNode } from './types'

describe('hexagon mark', () => {
  it('draws fixed-pixel six-sided symbols and retains typed points', () => {
    const rows = [
      { id: 'a', x: 2, y: 3, count: 4 },
      { id: 'b', x: 7, y: 8, count: 9 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          hexagon(rows, {
            x: 'x',
            y: 'y',
            r: 'count',
            rScale: (count) => Math.sqrt(count) * 2,
            key: 'id',
            fill: (row) => (row.count > 5 ? '#1d4ed8' : '#93c5fd'),
          }),
        ],
        ...linearAxes([0, 10], [0, 10]),
      }),
      { width: 480, height: 260 },
    )
    const areas = flatten(scene.nodes).filter(
      (node): node is SceneArea => node.kind === 'area',
    )

    expect(areas).toHaveLength(2)
    expect(areas.every((area) => area.points.length === 6)).toBe(true)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
  })

  it('does not map or render negative raw radii', () => {
    const mapRadius = vi.fn((radius: number) => Math.abs(radius))
    const rows = [
      { id: 'negative', x: 2, y: 3, radius: -4 },
      { id: 'positive', x: 7, y: 8, radius: 4 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          hexagon(rows, {
            x: 'x',
            y: 'y',
            r: 'radius',
            rScale: mapRadius,
            key: 'id',
          }),
        ],
        ...linearAxes([0, 10], [0, 10]),
      }),
      { width: 480, height: 260 },
    )

    expect(mapRadius).toHaveBeenCalledTimes(1)
    expect(mapRadius).toHaveBeenCalledWith(4)
    expect(scene.points.map((point) => point.datum.id)).toEqual(['positive'])
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
