import { describe, expect, it, vi } from 'vitest'
import { canvasChartRenderer, createLayeredChartRenderer } from './canvas'
import { createChartScene, defineChart } from './scene'
import { createSvgChartRenderer } from './svg-surface'
import type { ChartScene, SceneNode } from './types'

function rect(key: string): SceneNode {
  return Object.freeze({ kind: 'rect', key, x: 0, y: 0, width: 1, height: 1 })
}

function render(nodes: readonly SceneNode[]) {
  const svgScenes: ChartScene[] = []
  const canvasScenes: ChartScene[] = []
  const svg = {
    ...createSvgChartRenderer(),
    prerender: vi.fn((scene: ChartScene) => {
      svgScenes.push(scene)
      return ''
    }),
  }
  const canvas = {
    ...canvasChartRenderer,
    prerender: vi.fn((scene: ChartScene) => {
      canvasScenes.push(scene)
      return ''
    }),
  }
  const scene = createChartScene(
    defineChart({ marks: [], scales: { x: null, y: null } }),
    { width: 320, height: 180 },
  )
  const custom = Object.freeze({ ...rect('canvas'), renderer: canvas })
  createLayeredChartRenderer(svg).prerender(
    { ...scene, nodes: Object.freeze([...nodes, custom, rect('last')]) },
    { ariaLabel: 'Layer composition regression' },
  )
  return { svgScenes, canvasScenes, custom }
}

describe('Canvas layer composition', () => {
  it('keeps traversal linear for consecutive nodes and default focus groups', () => {
    const nodes = Object.freeze(
      Array.from({ length: 512 }, (_, i) => rect(`point-${i}`)),
    )
    const group = Object.freeze({
      kind: 'group' as const,
      key: 'focus',
      children: nodes,
    })
    const original = Array.prototype[Symbol.iterator]
    let visits = 0
    Array.prototype[Symbol.iterator] = function* () {
      for (const value of original.call(this)) {
        if (value?.kind === 'rect' && value.key.startsWith('point-'))
          visits += 1
        yield value
      }
      return undefined
    }
    let result: ReturnType<typeof render>
    try {
      result = render(Object.freeze([...nodes, group]))
    } finally {
      Array.prototype[Symbol.iterator] = original
    }
    expect(visits).toBeLessThan(nodes.length * 12)
    expect(result.svgScenes[0]!.nodes).toEqual([...nodes, group])
    expect(result.svgScenes[0]!.nodes[512]).toBe(group)
    expect(result.canvasScenes[0]!.nodes).toEqual([
      { ...result.custom, renderer: undefined },
    ])
    expect(result.custom.renderer).toBeDefined()
    expect(result.svgScenes[1]!.nodes.map((node) => node.key)).toEqual(['last'])
    expect(group.children).toBe(nodes)
  })

  it('preserves nested renderer boundaries and group metadata without mutating input', () => {
    const svg = createSvgChartRenderer()
    const custom = { ...canvasChartRenderer, prerender: vi.fn(() => '') }
    const children = Object.freeze([
      rect('before'),
      Object.freeze({ ...rect('custom'), renderer: custom }),
      rect('after'),
    ])
    const group = Object.freeze({
      kind: 'group' as const,
      key: 'group',
      translateX: 7,
      translateY: 11,
      children,
    })
    const scene = createChartScene(
      defineChart({ marks: [], scales: { x: null, y: null } }),
      { width: 320, height: 180 },
    )
    const scenes: ChartScene[] = []
    const recording = {
      ...svg,
      prerender: (value: ChartScene) => {
        scenes.push(value)
        return ''
      },
    }
    createLayeredChartRenderer(recording).prerender(
      { ...scene, nodes: Object.freeze([group]) },
      { ariaLabel: 'Nested layer regression' },
    )
    expect(scenes.map((value) => value.nodes)).toEqual([
      [{ ...group, children: [children[0]] }],
      [{ ...group, children: [children[2]] }],
    ])
    expect(custom.prerender).toHaveBeenCalledOnce()
    expect(group.children).toBe(children)
    expect(children[1]!.renderer).toBe(custom)
  })
})
