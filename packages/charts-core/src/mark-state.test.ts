import { describe, expect, it, vi } from 'vitest'
import { dot } from './dot'
import { defineChart, createChartScene } from './scene'
import { scaleLinear } from './scales-linear'
import { resolveMarkStateScene } from './mark-state'
import { renderChartSvg } from './svg'
import type { ChartFocusState, ChartMarkState, SceneGroup } from './types'

const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
]
const transition = { type: 'tween' as const, duration: 150 }

function fixture(target: 'group' | 'children' = 'group') {
  const scene = createChartScene(
    defineChart({
      marks: [dot(rows, { id: 'candles', x: 'x', y: 'y' })],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      guides: false,
    }),
    { width: 320, height: 180 },
  )
  const opacity = vi.fn(() => 0.2)
  const definitions: ChartMarkState[] = [
    {
      when: { focus: 'unmatched' },
      style: { opacity },
      transition,
    },
  ]
  const groups: SceneGroup[] = scene.points.map((point) => ({
    kind: 'group',
    key: point.key,
    states: { data: rows, definitions, points: [point], target },
    children: ['wick-upper', 'wick-lower', 'body'].map((suffix) => ({
      kind: 'rect',
      key: `${point.key}:${suffix}`,
      x: point.x,
      y: point.y,
      width: 4,
      height: 12,
      style: { fill: '#123456' },
    })),
  }))
  const point = scene.points[0]!
  const focus: ChartFocusState = {
    primary: point,
    group: [point],
    source: 'pointer',
    pinned: false,
  }
  return { scene: { ...scene, nodes: groups }, groups, focus, opacity }
}

describe('group state ownership', () => {
  it('keeps label focus context separate from independent state emphasis', () => {
    const { scene, groups, focus } = fixture()
    const opacity = vi.fn(() => 1)
    groups[0]!.children = [
      {
        kind: 'label',
        key: 'tick',
        x: 0,
        y: 0,
        text: 'Tick',
        focusOpacity: opacity,
      },
    ]
    const point = scene.points[1]!
    const emphasis: ChartFocusState = {
      primary: point,
      group: [point],
      source: 'legend',
      pinned: false,
    }
    const result = resolveMarkStateScene(scene, focus, null, emphasis).scene
    expect(result.nodes[0]!.style?.opacity).toBe(0.2)
    expect(result.nodes[1]!.style?.opacity).toBeUndefined()
    expect(opacity).toHaveBeenCalledWith({ focus, pointer: null })
    opacity.mockClear()
    resolveMarkStateScene(scene, null, null, emphasis)
    expect(opacity).toHaveBeenCalledWith({ focus: null, pointer: null })
  })

  it('updates dot and label geometry without mutating the base scene', () => {
    const { scene, groups, focus } = fixture('children')
    const point = scene.points[1]!
    const group = groups[1]!
    group.states = {
      ...group.states!,
      definitions: [
        {
          when: { focus: 'unmatched' },
          style: {
            dx: 3,
            dy: 4,
            r: 7,
            fontSize: 20,
            fontWeight: 600,
            rotate: 30,
          },
        },
      ],
    }
    group.children = [
      { kind: 'dot', key: `${point.key}:dot`, x: 10, y: 12, radius: 2 },
      {
        kind: 'label',
        key: `${point.key}:label`,
        x: 10,
        y: 12,
        text: 'Value',
        fontSize: 12,
      },
    ]
    const before = structuredClone(group)
    const result = resolveMarkStateScene(scene, focus).scene
      .nodes[1] as SceneGroup
    expect(result.children[0]).toMatchObject({ x: 13, y: 16, radius: 7 })
    expect(result.children[1]).toMatchObject({
      x: 13,
      y: 16,
      fontSize: 20,
      fontWeight: 600,
      rotate: 30,
    })
    expect(group).toEqual(before)
    expect(resolveMarkStateScene(scene, null).scene).toBe(scene)
  })

  it('resolves one state per datum group without multiplying child opacity', () => {
    const { scene, focus, opacity } = fixture()
    const resolved = resolveMarkStateScene(scene, focus)
    const groups = resolved.scene.nodes as SceneGroup[]
    expect(opacity).toHaveBeenCalledOnce()
    expect(groups[0]!.style?.opacity).toBeUndefined()
    expect(groups[1]!.style?.opacity).toBe(0.2)
    for (const group of groups)
      for (const child of group.children) {
        expect(child.style?.opacity).toBeUndefined()
      }
    expect(resolved.transitions).toEqual({ candles: transition })
    expect(
      renderChartSvg(resolved.scene, { ariaLabel: 'Candles' }).match(
        /opacity="0.2"/g,
      ),
    ).toHaveLength(1)
    expect(resolveMarkStateScene(scene, null).scene).toBe(scene)
  })

  it('preserves the existing child inheritance mode', () => {
    const { scene, focus, opacity } = fixture('children')
    const resolved = resolveMarkStateScene(scene, focus)
    const groups = resolved.scene.nodes as SceneGroup[]
    expect(opacity).toHaveBeenCalledTimes(3)
    expect(groups[1]!.style?.opacity).toBeUndefined()
    expect(
      groups[1]!.children.every((child) => child.style?.opacity === 0.2),
    ).toBe(true)
  })

  it('honors independent nested state definitions', () => {
    const { scene, groups, focus } = fixture()
    const point = scene.points[1]!
    groups[1]!.children = [
      {
        kind: 'group',
        key: 'nested',
        states: {
          data: rows,
          points: [point],
          target: 'group',
          definitions: [
            { when: { focus: 'unmatched' }, style: { stroke: '#ff0000' } },
          ],
        },
        children: groups[1]!.children,
      },
    ]
    const result = resolveMarkStateScene(scene, focus).scene
      .nodes[1] as SceneGroup
    expect(result.style?.opacity).toBe(0.2)
    expect(result.children[0]!.style?.stroke).toBe('#ff0000')
    expect(result.children[0]!.style?.opacity).toBeUndefined()
  })
})
