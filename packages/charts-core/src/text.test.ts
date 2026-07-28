import { describe, expect, it } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { linearAxes } from './test-scales'
import { text } from './text'
import type { SceneLabel, SceneNode } from './types'

describe('text mark', () => {
  it('maps per-datum anchor, rotation, and pixel offsets', () => {
    const rows = [
      { id: 'branch', x: 2, y: 3, label: 'Branch', branch: true },
      { id: 'leaf', x: 8, y: 7, label: 'Leaf', branch: false },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          text(rows, {
            x: 'x',
            y: 'y',
            text: 'label',
            key: 'id',
            anchor: (row) => (row.branch ? 'end' : 'start'),
            dx: (row) => (row.branch ? -6 : 6),
            rotate: (row) => (row.branch ? -10 : 10),
          }),
        ],
        ...linearAxes([0, 10], [0, 10]),
      }),
      { width: 480, height: 260 },
    )
    const textGroup = flatten(scene.nodes).find(
      (node) => node.className === 'ts-chart__text',
    )
    const labels =
      textGroup?.kind === 'group'
        ? textGroup.children.filter(
            (node): node is SceneLabel => node.kind === 'label',
          )
        : []

    expect(labels.map(({ anchor, rotate }) => ({ anchor, rotate }))).toEqual([
      { anchor: 'end', rotate: -10 },
      { anchor: 'start', rotate: 10 },
    ])
    expect(labels[0]!.x).toBeLessThan(scene.scales.x.map(2))
    expect(labels[1]!.x).toBeGreaterThan(scene.scales.x.map(8))
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
