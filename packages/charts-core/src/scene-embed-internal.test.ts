import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { createChartScene, defineChart } from './scene'
import { embedChartScene } from './scene-embed-internal'
import type { SceneGroup, SceneNode } from './types'

describe('embedded chart scenes', () => {
  it('adopts point identity, focus, states, and interaction references once', () => {
    const rows = [
      { id: 'a', x: 1, y: 2 },
      { id: 'b', x: 3, y: 4 },
    ]
    const child = createChartScene(
      defineChart({
        marks: [
          dot(rows, {
            id: 'dots',
            x: 'x',
            y: 'y',
            key: 'id',
            states: [
              {
                when: ({ datum }) => datum.id === 'a',
                style: { r: 8 },
              },
            ],
          }),
          whenFocused(
            dot(rows, {
              id: 'focused-dots',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
            { match: 'x', retarget: true },
          ),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 4]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        },
      }),
      { width: 240, height: 180 },
    )
    const originalDot = flatten(child.nodes).find(
      (node) =>
        node.kind === 'dot' && node.interaction?.point === child.points[0],
    )
    expect(originalDot?.kind).toBe('dot')

    const embedded = embedChartScene(child, {
      ownerId: 'views',
      childId: 'main',
      x: 40,
      y: 25,
    })
    const nodes = flatten(embedded.nodes)
    const stateLayer = nodes.find(
      (node): node is SceneGroup => node.kind === 'group' && !!node.states,
    )
    const focusLayer = nodes.find(
      (node): node is SceneGroup => node.kind === 'group' && !!node.focus,
    )
    const mappedDot = nodes.find(
      (node) =>
        node.kind === 'dot' && node.interaction?.point === embedded.points[0],
    )

    expect(embedded.points).toHaveLength(2)
    expect(embedded.points[0]?.datum).toBe(rows[0])
    expect(embedded.points[0]?.key).toMatch(/^views:main:/)
    expect(embedded.points[0]?.markId).toBe('views:main:dots')
    expect(embedded.points[0]?.x).toBe((child.points[0]?.x ?? 0) + 40)
    expect(embedded.points[0]?.y).toBe((child.points[0]?.y ?? 0) + 25)
    expect(mappedDot?.kind).toBe('dot')
    if (mappedDot?.kind === 'dot' && originalDot?.kind === 'dot') {
      expect(mappedDot.x).toBe(originalDot.x)
      expect(mappedDot.y).toBe(originalDot.y)
    }
    expect(stateLayer?.states?.points[0]).toBe(embedded.points[0])
    expect(focusLayer?.focus?.points[0]?.markId).toBe('views:main:focused-dots')
    expect(focusLayer?.focus?.candidates?.length).toBeGreaterThan(0)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__focus-layer--default'),
      ),
    ).toHaveLength(0)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
