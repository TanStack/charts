import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ChartScene, SceneNode } from '@tanstack/charts/types'
import { resolveNativePaint } from './paint'
import { NativeChartScene, resolveNativeLineJoin } from './SvgScene'

vi.mock('react-native-svg', () => ({
  Circle: 'circle',
  ClipPath: 'clipPath',
  Defs: 'defs',
  G: 'g',
  Line: 'line',
  LinearGradient: 'linearGradient',
  Path: 'path',
  Rect: 'rect',
  Stop: 'stop',
  Svg: 'svg',
  Text: 'text',
}))

describe('React Native SVG scene renderer', () => {
  it('maps every scene primitive, gradients, clipping, and authored paths', () => {
    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={scene()}
        color="#111827"
        idPrefix="native-one"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain('<linearGradient')
    expect(markup).toContain('id="native-one-fill"')
    expect(markup).toContain('url(#native-one-fill)')
    expect(markup).toContain('<clipPath')
    expect(markup).toContain('transform="translate(10 12)"')
    expect(markup).toContain('stroke-dasharray="2 4"')
    expect(markup).toContain('d="M2,4L20,30"')
    expect(markup).toContain('d="M0,20L20,0L40,20Z"')
    expect(markup).toContain('d="M0,0C10,20,20,20,30,0"')
    expect(markup).toContain('<circle')
    expect(markup).toContain('rx="4"')
    expect(markup).toContain('rotate(-30 40 50)')
    expect(markup).not.toContain('#fedcba')
    expect(markup).not.toContain('currentColor')
    expect(markup).not.toContain('var(--')
  })

  it('makes the two unsupported SVG joins an explicit lossy mapping', () => {
    expect(resolveNativeLineJoin('arcs')).toBe('round')
    expect(resolveNativeLineJoin('miter-clip')).toBe('miter')
    expect(resolveNativeLineJoin('round')).toBe('round')
  })

  it('keeps distinct authored gradient ids distinct after encoding', () => {
    const collisionScene = scene()
    collisionScene.gradients = ['a.b', 'a:b', 'ab', '', 'a)b'].map((id) => ({
      id,
      stops: [{ offset: 0, color: '#2563eb' }],
    }))
    collisionScene.nodes = collisionScene.gradients.map((gradient, index) => ({
      kind: 'rect' as const,
      key: gradient.id,
      x: index * 10,
      y: 0,
      width: 10,
      height: 10,
      style: { fill: `url(#${gradient.id})` },
    }))

    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={collisionScene}
        color="#111827"
        idPrefix="native-one"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain('id="native-one-a_x2e_b"')
    expect(markup).toContain('url(#native-one-a_x2e_b)')
    expect(markup).toContain('id="native-one-a_x3a_b"')
    expect(markup).toContain('url(#native-one-a_x3a_b)')
    expect(markup).toContain('id="native-one-ab"')
    expect(markup).toContain('url(#native-one-ab)')
    expect(markup).toContain('id="native-one-_"')
    expect(markup).toContain('url(#native-one-_)')
    expect(markup).toContain('id="native-one-a_x29_b"')
    expect(markup).toContain('url(#native-one-a_x29_b)')
  })

  it('paints focus underlays and overlays around the base scene in one SVG', () => {
    const base = scene()
    base.nodes = [
      {
        kind: 'rect',
        key: 'base',
        x: 20,
        y: 20,
        width: 20,
        height: 20,
        style: { fill: '#222222' },
      },
    ]
    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={base}
        color="#111827"
        focusFill="#fef3c7"
        focusPresentation={{
          under: [
            {
              kind: 'rect',
              key: 'under',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              style: { fill: '#111111' },
            },
          ],
          over: [
            {
              kind: 'group',
              key: 'over',
              clip: { x: 0, y: 0, width: 80, height: 60 },
              children: [
                {
                  kind: 'dot',
                  key: 'focus-dot',
                  x: 50,
                  y: 30,
                  radius: 5,
                  style: {
                    fill: 'var(--ts-chart-focus-fill, Canvas)',
                    stroke: '#333333',
                  },
                },
              ],
            },
          ],
        }}
        idPrefix="native-focus"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup.match(/<svg/g)).toHaveLength(1)
    expect(markup.indexOf('#111111')).toBeLessThan(markup.indexOf('#222222'))
    expect(markup.indexOf('#222222')).toBeLessThan(markup.indexOf('#fef3c7'))
    expect(markup).toContain('<clipPath')
    expect(markup).toContain('fill="#fef3c7"')
  })
})

function scene(): ChartScene {
  const nodes: SceneNode[] = [
    {
      kind: 'group',
      key: 'translated-grid',
      translateX: 10,
      translateY: 12,
      clip: { x: 0, y: 0, width: 80, height: 60 },
      style: {
        stroke: 'currentColor',
        strokeOpacity: 0.4,
        strokeWidth: 3,
        strokeDasharray: '2 4',
      },
      children: [{ kind: 'rule', key: 'rule', x1: 0, y1: 0, x2: 30, y2: 30 }],
    },
    {
      kind: 'polyline',
      key: 'line',
      points: [
        [2, 4],
        [20, 30],
      ],
      style: { fill: 'none', stroke: '#abcdef', lineJoin: 'arcs' },
    },
    {
      kind: 'polyline',
      key: 'curved-line',
      points: [],
      path: 'M0,0C10,20,20,20,30,0',
      style: {
        fill: 'none',
        stroke: '#334455',
        lineJoin: 'miter-clip',
      },
    },
    {
      kind: 'area',
      key: 'area',
      points: [
        [0, 20],
        [20, 0],
        [40, 20],
      ],
      style: { fill: 'url(#fill)' },
    },
    {
      kind: 'dot',
      key: 'dot',
      x: 50,
      y: 30,
      radius: 5,
      style: { fill: 'var(--dot, #ff0000)' },
    },
    {
      kind: 'rect',
      key: 'rect',
      x: 60,
      y: 10,
      width: 20,
      height: 30,
      radius: 4,
      style: { fill: '#00ff00' },
    },
    {
      kind: 'label',
      key: 'label',
      x: 40,
      y: 50,
      text: 'Native',
      anchor: 'middle',
      baseline: 'middle',
      rotate: -30,
      fontSize: 12,
      fontWeight: 600,
      style: { fill: '#111111' },
    },
    {
      kind: 'group',
      key: 'inactive-focus',
      focus: { match: 'primary', anchors: [], points: [], placement: 'over' },
      children: [
        {
          kind: 'dot',
          key: 'inactive-focus-dot',
          x: 50,
          y: 30,
          radius: 9,
          style: { fill: '#fedcba' },
        },
      ],
    },
  ]
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes,
    points: [],
    scales: {},
    colors: {
      type: 'ordinal',
      domain: [],
      range: [],
      map: () => '#2563eb',
    },
    gradients: [
      {
        id: 'fill',
        stops: [
          { offset: 0, color: '#2563eb', opacity: 0.2 },
          { offset: 1, color: '#2563eb' },
        ],
      },
    ],
    theme: {
      foreground: '#111111',
      muted: '#666666',
      grid: '#999999',
      background: '#f8fafc',
      palette: ['#2563eb'],
    },
  }
}
