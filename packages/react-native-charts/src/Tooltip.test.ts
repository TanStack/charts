import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ColorValue } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import type {
  ChartPoint,
  ChartScene,
  ChartTooltipAnchorContext,
} from '@tanstack/charts/types'
import {
  createNativeTooltipContent,
  NativeChartTooltip,
  placeNativeTooltip,
  resolveNativeTooltipAnchor,
} from './Tooltip'
import type { NativeChartTooltipRenderContext } from './Tooltip'

vi.mock('react-native', async () => {
  const ReactModule = await import('react')
  return {
    Text: 'span',
    View: ({
      children,
      style,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { style?: unknown }) =>
      ReactModule.createElement(
        'div',
        {
          ...rest,
          style: (Array.isArray(style)
            ? Object.assign({}, ...style.filter(Boolean))
            : style) as React.CSSProperties,
        },
        children,
      ),
  }
})

describe('native tooltip model', () => {
  it('builds the supported shared-axis default content', () => {
    const points = [point('alpha', 'Alpha', 3), point('beta', 'Beta', 7)]

    expect(createNativeTooltipContent(points, scene(points))).toEqual({
      title: 'x: 1',
      rows: [
        { label: 'Alpha', value: '3', color: '#2563eb' },
        { label: 'Beta', value: '7', color: '#f97316' },
      ],
    })
  })

  it('chooses and clamps a placement inside the native layout boundary', () => {
    expect(
      placeNativeTooltip(
        { x: 4, y: 4 },
        { width: 20, height: 10 },
        { width: 100, height: 60 },
        'top',
        10,
      ),
    ).toEqual({ left: 8, top: 8, placement: 'top' })
  })

  it('preserves an intentional null custom body', () => {
    const points = [point('alpha', 'Alpha', 3)]
    const markup = renderToStaticMarkup(
      React.createElement(NativeChartTooltip<unknown, number, number>, {
        scene: scene(points),
        width: 100,
        height: 60,
        points,
        pointer: null,
        focusSource: 'programmatic',
        pinned: false,
        color: '#111827',
        resolvePaint: (value) => value,
        dismiss: vi.fn(),
        render: () => null,
      }),
    )

    expect(markup).not.toContain('<span')
  })

  it('supplies pin state to custom content', () => {
    const points = [point('alpha', 'Alpha', 3)]
    const pinnedStates: boolean[] = []

    const renderPinned = (pinned: boolean) =>
      renderToStaticMarkup(
        React.createElement(NativeChartTooltip<unknown, number, number>, {
          scene: scene(points),
          width: 100,
          height: 60,
          points,
          pointer: null,
          focusSource: 'programmatic',
          options: {
            content: (_focusedPoints, context) => {
              pinnedStates.push(context.pinned)
              return { rows: [] }
            },
          },
          pinned,
          color: '#111827',
          resolvePaint: (value) => value,
          dismiss: vi.fn(),
        }),
      )

    renderPinned(false)
    renderPinned(true)

    expect(pinnedStates).toEqual([false, true])
  })

  it('resolves axis anchors and supplies focus context to custom anchors', () => {
    const points = [point('alpha', 'Alpha', 3), point('beta', 'Beta', 7)]
    const currentScene = scene(points)

    expect(
      resolveNativeTooltipAnchor(
        points[0]!,
        points,
        currentScene,
        null,
        'keyboard',
        true,
        { anchor: { x: 'plot-center', y: 'plot-top' } },
      ),
    ).toEqual({ x: 50, y: 0 })

    let context: ChartTooltipAnchorContext<unknown, number, number> | undefined
    expect(
      resolveNativeTooltipAnchor(
        points[0]!,
        points,
        currentScene,
        null,
        'keyboard',
        true,
        {
          anchor: (_focusedPoints, nextContext) => {
            context = nextContext
            return { x: 75, y: 25 }
          },
        },
      ),
    ).toEqual({ x: 75, y: 25 })
    expect(context).toEqual({
      focus: {
        primary: points[0],
        group: points,
        source: 'keyboard',
        pinned: true,
      },
      pointer: null,
      plot: currentScene.chart,
      surface: { width: 100, height: 60 },
      scales: currentScene.scales,
    })
  })

  it('keeps the focused point stable when display rows are sorted', () => {
    const beta = point('beta', 'Beta', 7)
    const alpha = point('alpha', 'Alpha', 3)
    const focusedPoints = [beta, alpha]
    const currentScene = scene(focusedPoints)
    const format = vi.fn(
      (focused: ChartPoint<unknown, number, number>) => focused.key,
    )
    const anchor = vi.fn(
      (
        _points: readonly ChartPoint<unknown, number, number>[],
        _context: ChartTooltipAnchorContext<unknown, number, number>,
      ) => ({ x: 75, y: 25 }),
    )
    let renderedPoints:
      readonly ChartPoint<unknown, number, number>[] | undefined

    renderToStaticMarkup(
      React.createElement(NativeChartTooltip<unknown, number, number>, {
        scene: currentScene,
        width: 100,
        height: 60,
        points: focusedPoints,
        pointer: null,
        focusSource: 'keyboard',
        options: { anchor, format },
        pinned: true,
        color: '#111827',
        resolvePaint: (value) => value,
        dismiss: vi.fn(),
        render: (context) => {
          renderedPoints = context.points
          return null
        },
      }),
    )

    expect(renderedPoints).toEqual([alpha, beta])
    expect(format).toHaveBeenCalledWith(beta)
    expect(anchor).toHaveBeenCalledWith([alpha, beta], {
      focus: {
        primary: beta,
        group: focusedPoints,
        source: 'keyboard',
        pinned: true,
      },
      pointer: null,
      plot: currentScene.chart,
      surface: { width: 100, height: 60 },
      scales: currentScene.scales,
    })
  })

  it('orders grouped points visually unless color-domain order is requested', () => {
    const right = point('alpha', 'Alpha', 4, { x: 80, xValue: 8, y: 20 })
    const left = point('beta', 'Beta', 4, { x: 20, xValue: 2, y: 20 })
    const focusedPoints = [right, left]
    const currentScene = scene(focusedPoints)
    const visualRender = vi.fn<
      (
        context: NativeChartTooltipRenderContext<unknown, number, number>,
      ) => React.ReactNode
    >(() => null)
    const colorRender = vi.fn<
      (
        context: NativeChartTooltipRenderContext<unknown, number, number>,
      ) => React.ReactNode
    >(() => null)
    const sharedProps = {
      scene: currentScene,
      width: 100,
      height: 60,
      points: focusedPoints,
      pointer: null,
      focusSource: 'keyboard' as const,
      pinned: true,
      color: '#111827',
      resolvePaint: (value: ColorValue) => value,
      dismiss: vi.fn(),
    }

    renderToStaticMarkup(
      React.createElement(NativeChartTooltip<unknown, number, number>, {
        ...sharedProps,
        render: visualRender,
      }),
    )
    renderToStaticMarkup(
      React.createElement(NativeChartTooltip<unknown, number, number>, {
        ...sharedProps,
        options: { sort: 'color-domain' },
        render: colorRender,
      }),
    )

    expect(visualRender.mock.calls[0]?.[0].points).toEqual([left, right])
    expect(colorRender.mock.calls[0]?.[0].points).toEqual([right, left])
  })
})

function point(
  key: string,
  groupLabel: string,
  yValue: number,
  position: { x?: number; xValue?: number; y?: number } = {},
): ChartPoint<unknown, number, number> {
  return {
    key,
    markId: 'series',
    group: key,
    groupLabel,
    datum: null,
    datumIndex: 0,
    xValue: position.xValue ?? 1,
    yValue,
    x: position.x ?? 20,
    y: position.y ?? yValue * 4,
    color: key === 'alpha' ? '#2563eb' : '#f97316',
  }
}

function scene(
  points: readonly ChartPoint<unknown, number, number>[],
): ChartScene<unknown, number, number> {
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes: [],
    points,
    scales: {},
    colors: {
      type: 'ordinal',
      domain: ['alpha', 'beta'],
      range: ['#2563eb', '#f97316'],
      map: (value) => (value === 'beta' ? '#f97316' : '#2563eb'),
    },
    gradients: [],
    theme: {
      foreground: '#111827',
      muted: '#6b7280',
      grid: '#d1d5db',
      background: 'transparent',
      palette: ['#2563eb', '#f97316'],
    },
  }
}
