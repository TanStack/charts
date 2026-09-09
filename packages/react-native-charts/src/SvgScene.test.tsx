import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ChartScene, SceneNode } from '@tanstack/charts/types'
import {
  rectCornerRadiiPath,
  resolveRectCornerRadii,
} from '@tanstack/charts/renderer/rect'
import { NativeChartFocusOverlay } from './FocusOverlay'
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
  RadialGradient: 'radialGradient',
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

  it('renders radial gradients with inherited focal defaults', () => {
    const radialScene = scene()
    radialScene.gradients = [
      {
        type: 'radial',
        id: 'spot',
        cx: 0.25,
        cy: 0.75,
        r: 1.5,
        fx: -1,
        stops: [{ offset: 0.5, color: '#2563eb', opacity: 0.6 }],
      },
      {
        type: 'radial',
        id: 'non-finite',
        cx: Number.NaN,
        cy: Number.POSITIVE_INFINITY,
        r: Number.NEGATIVE_INFINITY,
        fy: Number.NaN,
        stops: [{ offset: Number.POSITIVE_INFINITY, color: '#abcdef' }],
      },
    ]
    radialScene.nodes = [
      {
        kind: 'rect',
        key: 'radial-fill',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        style: { fill: 'url(#spot)' },
      },
    ]

    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={radialScene}
        color="#111827"
        idPrefix="native-one"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain(
      '<radialGradient id="native-one-spot" cx="25%" cy="75%" r="100%" fx="0%" fy="75%">',
    )
    expect(markup).toContain('offset="50%"')
    expect(markup).toContain('stop-opacity="0.6"')
    expect(markup).toContain('fill="url(#native-one-spot)"')
    expect(markup).toContain(
      '<radialGradient id="native-one-non-finite" cx="0%" cy="100%" r="0%" fx="0%" fy="0%">',
    )
    expect(markup).toContain('offset="100%"')
  })

  it('clamps decreasing gradient stops forward without reordering colors', () => {
    const radialScene = scene()
    radialScene.gradients = [
      {
        type: 'radial',
        id: 'authored-order',
        stops: [
          { offset: 1, color: '#ff0000' },
          { offset: 0, color: '#0000ff' },
        ],
      },
    ]

    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={radialScene}
        color="#111827"
        idPrefix="native-one"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup.match(/offset="100%"/g)).toHaveLength(2)
    expect(markup.indexOf('#ff0000')).toBeLessThan(markup.indexOf('#0000ff'))
  })

  it('renders selective rectangle corners as a fixed native SVG path', () => {
    const selectiveScene = scene()
    selectiveScene.theme = {
      ...selectiveScene.theme,
      background: 'transparent',
    }
    selectiveScene.nodes = [
      {
        kind: 'rect',
        key: 'selective',
        x: 10,
        y: 20,
        width: 40,
        height: 30,
        cornerRadii: [4, 0, 8, 2],
        style: {
          fill: '#00ff00',
          stroke: '#111827',
          strokeWidth: 2,
        },
      },
    ]

    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={selectiveScene}
        color="#111827"
        idPrefix="native-corners"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain(
      'd="M14,20H50A0,0 0 0 1 50,20V42A8,8 0 0 1 42,50H12A2,2 0 0 1 10,48V24A4,4 0 0 1 14,20Z"',
    )
    expect(markup).toContain('fill="#00ff00"')
    expect(markup).toContain('stroke="#111827"')
    expect(markup).toContain('stroke-width="2"')
    expect(markup).not.toContain('<rect')
  })

  it('normalizes invalid and oversized native corner radii proportionally', () => {
    expect(resolveRectCornerRadii([8, 4, -2, Infinity], 6, 10)).toEqual([
      4, 2, 0, 0,
    ])
    expect(resolveRectCornerRadii([8, 4, 2, 1], -6, -10)).toEqual([
      4, 2, 1, 0.5,
    ])
    expect(resolveRectCornerRadii([8, 4, 2, 1], 0, 10)).toEqual([0, 0, 0, 0])

    const path = rectCornerRadiiPath(0, 0, 6, 10, [8, 4, -2, Infinity])
    expect(path).toBe(
      'M4,0H4A2,2 0 0 1 6,2V10A0,0 0 0 1 6,10H0A0,0 0 0 1 0,10V4A4,4 0 0 1 4,0Z',
    )
    expect(path).not.toMatch(/NaN|Infinity|-[0-9]/)
    expect(rectCornerRadiiPath(10, 20, -6, -10, [4, 2, 1, 0.5])).toBe(
      'M8,10H8A2,2 0 0 1 10,12V19A1,1 0 0 1 9,20H4.5A0.5,0.5 0 0 1 4,19.5V14A4,4 0 0 1 8,10Z',
    )
  })

  it('applies native typography and font scale to scene labels', () => {
    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={scene()}
        color="#111827"
        fontFamily="Inter"
        fontStyle="italic"
        fontStretch="condensed"
        letterSpacing={0.5}
        fontScale={2}
        idPrefix="native-type"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain('font-family="Inter"')
    expect(markup).toContain('font-style="italic"')
    expect(markup).toContain('font-stretch="condensed"')
    expect(markup).toContain('letter-spacing="1"')
    expect(markup).toContain('font-size="24"')
  })

  it('makes the two unsupported SVG joins an explicit lossy mapping', () => {
    expect(resolveNativeLineJoin('arcs')).toBe('round')
    expect(resolveNativeLineJoin('miter-clip')).toBe('miter')
    expect(resolveNativeLineJoin('round')).toBe('round')
  })

  it('renders structured disconnected polygons and holes with even-odd fill', () => {
    const polygonScene = scene()
    polygonScene.nodes = [
      {
        kind: 'area',
        key: 'contour',
        points: [[99, 99]],
        path: 'M99,99Z',
        polygons: [
          [
            [
              [0, 0],
              [20, 0],
              [20, 20],
              [0, 20],
            ],
            [
              [5, 5],
              [15, 5],
              [15, 15],
              [5, 15],
            ],
          ],
          [
            [
              [30, 0],
              [40, 0],
              [40, 10],
              [30, 10],
            ],
          ],
        ],
        style: { fill: '#2563eb' },
      },
    ]

    const markup = renderToStaticMarkup(
      <NativeChartScene
        scene={polygonScene}
        color="#111827"
        idPrefix="native-one"
        resolvePaint={resolveNativePaint}
      />,
    )

    expect(markup).toContain('fill-rule="evenodd"')
    expect(markup).toContain(
      'd="M0,0L20,0L20,20L0,20ZM5,5L15,5L15,15L5,15ZM30,0L40,0L40,10L30,10Z"',
    )
    expect(markup).not.toContain('M99,99Z')
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

  it('renders only the resolved native retarget candidate', () => {
    const focusScene = scene()
    const first = {
      key: 'guide:a',
      markId: 'guide',
      group: null,
      groupLabel: 'guide',
      datum: { id: 'a' },
      datumIndex: 0,
      xValue: 1,
      yValue: 0,
      x: 10,
      y: 30,
      color: '#2563eb',
    }
    const second = {
      ...first,
      key: 'guide:b',
      datum: { id: 'b' },
      datumIndex: 1,
      xValue: 2,
      x: 90,
    }
    const candidates: SceneNode[] = [
      {
        kind: 'group',
        key: 'guide',
        children: [
          {
            kind: 'rule',
            key: first.key,
            x1: 10,
            x2: 10,
            y1: 0,
            y2: 60,
          },
          {
            kind: 'rule',
            key: second.key,
            x1: 90,
            x2: 90,
            y1: 0,
            y2: 60,
          },
        ],
      },
    ]
    focusScene.nodes = [
      {
        kind: 'group',
        key: 'focus:guide',
        children: [],
        focus: {
          match: 'primary',
          points: [first, second],
          placement: 'over',
          retarget: true,
          candidates,
        },
      },
    ]
    const render = (points: readonly (typeof first)[]) =>
      renderToStaticMarkup(
        <NativeChartFocusOverlay
          width={100}
          height={60}
          scene={focusScene}
          points={points}
          placement="over"
          source="pointer"
          pinned={false}
          showDefault={false}
          color="#111827"
          fill="#ffffff"
          idPrefix="native-focus"
          resolvePaint={resolveNativePaint}
        />,
      )

    expect(render([])).toBe('')
    expect(render([first])).toContain('x1="10"')
    expect(render([first])).not.toContain('x1="90"')
    expect(render([second])).toContain('x1="90"')
    expect(render([second])).not.toContain('x1="10"')
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
