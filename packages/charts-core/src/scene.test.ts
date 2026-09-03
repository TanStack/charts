import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { bandX, bandY } from './band'
import { mountChart } from './dom'
import { frame } from './frame'
import { lineY } from './line'
import { colorLegend } from './legend'
import { createMark } from './mark'
import {
  createChartScene,
  defineChart,
  findNearestPoint,
  viewportInteractionPoints,
} from './scene'
import { renderChartSvg } from './svg'
import { linearAxes, utcXAxes } from './test-scales'
import { text } from './text'
import type {
  ChartControlContext,
  ChartDefinition,
  ChartPoint,
  ChartScene,
  SceneDot,
  SceneNode,
} from './types'

describe('native mark and channel scene', () => {
  it('groups one flat arbitrary dataset through a z channel', () => {
    const data = [
      { id: 'a:1', series: 'a', at: new Date('2026-01-01'), value: 10 },
      { id: 'b:1', series: 'b', at: new Date('2026-01-01'), value: 14 },
      { id: 'a:2', series: 'a', at: new Date('2026-01-02'), value: 12 },
      { id: 'b:2', series: 'b', at: new Date('2026-01-02'), value: 18 },
    ]
    const definition = defineChart({
      marks: [
        lineY(data, {
          id: 'requests',
          x: 'at',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
      ],
      color: { legend: colorLegend() },
      ...utcXAxes([new Date('2026-01-01'), new Date('2026-01-02')], [10, 18]),
    })
    const scene = createChartScene(definition, { width: 600, height: 300 })
    const polylines = flatten(scene.nodes).filter(
      (node) => node.kind === 'polyline',
    )

    expect(scene.margin.top).toBe(37)
    expect(scene.chart.width).toBeGreaterThan(0)
    expect(scene.chart.height).toBeGreaterThan(0)
    expect(scene.colors.domain).toEqual(['a', 'b'])
    expect(
      flatten(scene.nodes).filter((node) => node.key.startsWith('legend-dot:')),
    ).toHaveLength(2)
    expect(polylines).toHaveLength(2)
    expect(scene.points).toHaveLength(4)
    expect(new Set(scene.points.map((point) => point.groupLabel))).toEqual(
      new Set(['a', 'b']),
    )
  })

  it('keeps explicit datum keys stable when input order changes', () => {
    const data = [
      { id: 'first', x: 0, y: 10 },
      { id: 'second', x: 1, y: 20 },
    ]
    const makeScene = (rows: typeof data) =>
      createChartScene(
        defineChart({
          marks: [
            lineY(rows, {
              id: 'stable',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          ...linearAxes([0, 1], [0, 20]),
        }),
        { width: 400, height: 240 },
      )

    const before = makeScene(data)
    const after = makeScene([...data].reverse())

    expect(new Set(before.points.map((point) => point.key))).toEqual(
      new Set(after.points.map((point) => point.key)),
    )
  })

  it('supports raw numeric data with implicit x and y channels', () => {
    const values = [4, 9, 7]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(values, { points: true })],
        ...linearAxes([0, 2], [0, 9]),
      }),
      { width: 480, height: 260 },
    )

    expect(scene.points.map((point) => point.datum)).toEqual(values)
    expect(scene.points.map((point) => point.xValue)).toEqual([0, 1, 2])
    const marks = scene.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected mark group')
    expect(
      flatten(marks.children).filter((node) => node.kind === 'dot'),
    ).toHaveLength(3)
  })

  it('places resolved behavior fallback and controls after guides and before focus', () => {
    const extension = {
      id: 'test-behavior-control',
      create: () => {
        throw new Error('Scene creation must not mount host controls')
      },
    }
    const resolve = vi.fn((_context: ChartControlContext) => ({
      nodes: [
        {
          kind: 'group' as const,
          key: 'behavior-fallback',
          className: 'test-behavior-fallback',
          children: [],
        },
      ],
      controls: [
        {
          key: 'overlay',
          extension,
          fallbackNodeKey: 'behavior-fallback',
        },
      ],
    }))
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        controls: [{ id: 'test-behavior', resolve }],
        ...linearAxes([0, 2], [0, 3]),
      }),
      { width: 480, height: 260 },
    )
    const keys = scene.nodes.map((node) => node.key)

    expect(resolve).toHaveBeenCalledOnce()
    expect(resolve.mock.calls[0]?.[0]).toMatchObject({
      chart: scene.chart,
      scales: scene.scales,
      colors: scene.colors,
      theme: scene.theme,
      width: 480,
      height: 260,
    })
    expect(keys.indexOf('behavior-fallback')).toBeGreaterThan(
      keys.indexOf('axes'),
    )
    const defaultFocusIndex = keys.findIndex((key) =>
      key.startsWith('default-focus:'),
    )
    expect(defaultFocusIndex).toBeGreaterThan(-1)
    expect(keys.indexOf('behavior-fallback')).toBeLessThan(defaultFocusIndex)
    expect(scene.controls).toEqual([
      {
        key: 'overlay',
        extension,
        fallbackNodeKey: 'behavior-fallback',
      },
    ])
    expect(renderChartSvg(scene, { ariaLabel: 'Behavior fallback' })).toContain(
      'test-behavior-fallback',
    )
  })

  it('configures the built-in focus ring while retaining point-color defaults', () => {
    const rows = [
      { id: 'alpha', series: 'Alpha', x: 0, y: 1 },
      { id: 'beta', series: 'Beta', x: 1, y: 2 },
    ]
    const spec = {
      marks: [
        lineY(rows, {
          id: 'series',
          x: 'x',
          y: 'y',
          z: 'series',
          key: 'id',
        }),
      ],
      color: {
        domain: ['Alpha', 'Beta'],
        range: ['#2563eb', '#f97316'],
      },
      theme: { background: '#f8fafc', foreground: '#0f172a' },
      ...linearAxes([0, 1], [0, 2]),
    } as const
    const scene = createChartScene(
      defineChart({
        ...spec,
        focusRing: {
          radius: 4,
          strokeWidth: 1.5,
          fill: '#ffffff',
        },
      }),
      { width: 320, height: 180 },
    )
    const focusDots = flatten(scene.nodes).filter(
      (node) =>
        node.kind === 'dot' &&
        scene.points.some((point) => point.key === node.key) &&
        node.radius === 4,
    )

    expect(scene.theme).toMatchObject({
      background: '#f8fafc',
      foreground: '#0f172a',
    })
    expect(focusDots.map((node) => node.style)).toEqual([
      { fill: '#ffffff', stroke: '#2563eb', strokeWidth: 1.5 },
      { fill: '#ffffff', stroke: '#f97316', strokeWidth: 1.5 },
    ])

    const fixedStroke = createChartScene(
      defineChart({
        ...spec,
        focusRing: {
          radius: 3,
          strokeWidth: 2,
          fill: '#ffffff',
          stroke: '#0f172a',
        },
      }),
      { width: 320, height: 180 },
    )
    const fixedDots = flatten(fixedStroke.nodes).filter(
      (node) => node.kind === 'dot' && node.radius === 3,
    )

    expect(fixedDots.map((node) => node.style)).toEqual([
      { fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2 },
      { fill: '#ffffff', stroke: '#0f172a', strokeWidth: 2 },
    ])

    const booleanRing = createChartScene(
      defineChart({ ...spec, focusRing: true }),
      { width: 320, height: 180 },
    )
    const booleanDots = flatten(booleanRing.nodes).filter(
      (node): node is SceneDot => node.kind === 'dot' && node.radius === 5,
    )

    expect(booleanDots.map((node) => node.style)).toEqual([
      {
        fill: 'var(--ts-chart-focus-fill, Canvas)',
        stroke: '#2563eb',
        strokeWidth: 2.5,
      },
      {
        fill: 'var(--ts-chart-focus-fill, Canvas)',
        stroke: '#f97316',
        strokeWidth: 2.5,
      },
    ])

    const undefinedFields = createChartScene(
      defineChart({
        ...spec,
        focusRing: {
          radius: undefined,
          fill: undefined,
          stroke: undefined,
          strokeWidth: undefined,
        },
      }),
      { width: 320, height: 180 },
    )
    const undefinedDots = flatten(undefinedFields.nodes).filter(
      (node) => node.kind === 'dot' && node.radius === 5,
    )

    expect(undefinedDots.map((node) => node.style)).toEqual(
      booleanDots.map((node) => node.style),
    )

    const zeroFields = createChartScene(
      defineChart({
        ...spec,
        focusRing: {
          radius: 0,
          strokeWidth: 0,
        },
      }),
      { width: 320, height: 180 },
    )
    const zeroDots = flatten(zeroFields.nodes).filter(
      (node): node is SceneDot =>
        node.kind === 'dot' &&
        zeroFields.points.some((point) => point.key === node.key),
    )

    expect(
      zeroDots.map((node) => ({ radius: node.radius, style: node.style })),
    ).toEqual([
      {
        radius: 0,
        style: {
          fill: 'var(--ts-chart-focus-fill, Canvas)',
          stroke: '#2563eb',
          strokeWidth: 0,
        },
      },
      {
        radius: 0,
        style: {
          fill: 'var(--ts-chart-focus-fill, Canvas)',
          stroke: '#f97316',
          strokeWidth: 0,
        },
      },
    ])

    for (const invalid of [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      const invalidFields = createChartScene(
        defineChart({
          ...spec,
          focusRing: {
            radius: invalid,
            strokeWidth: invalid,
          },
        }),
        { width: 320, height: 180 },
      )
      const invalidDots = flatten(invalidFields.nodes).filter(
        (node): node is SceneDot =>
          node.kind === 'dot' &&
          invalidFields.points.some((point) => point.key === node.key),
      )

      expect(
        invalidDots.map((node) => ({
          radius: node.radius,
          style: node.style,
        })),
      ).toEqual(
        booleanDots.map((node) => ({
          radius: node.radius,
          style: node.style,
        })),
      )
    }
    expectTypeOf(scene).toMatchTypeOf<ChartScene<(typeof rows)[number]>>()
  })

  it('uses the theme focus ring unless the definition overrides it', () => {
    const spec = {
      marks: [lineY([1, 2])],
      ...linearAxes([0, 1], [0, 2]),
    } as const
    const focusDots = (scene: ChartScene) =>
      flatten(scene.nodes).filter(
        (node): node is SceneDot =>
          node.kind === 'dot' &&
          scene.points.some((point) => point.key === node.key),
      )

    const themed = createChartScene(
      defineChart({
        ...spec,
        theme: {
          focusRing: {
            radius: 8,
            strokeWidth: 4,
            fill: '#f8fafc',
            stroke: '#0f172a',
          },
        },
      }),
      { width: 320, height: 180 },
    )

    expect(themed.theme.focusRing).toEqual({
      radius: 8,
      strokeWidth: 4,
      fill: '#f8fafc',
      stroke: '#0f172a',
    })
    expect(
      focusDots(themed).map((node) => ({
        radius: node.radius,
        style: node.style,
      })),
    ).toEqual([
      {
        radius: 8,
        style: {
          fill: '#f8fafc',
          stroke: '#0f172a',
          strokeWidth: 4,
        },
      },
      {
        radius: 8,
        style: {
          fill: '#f8fafc',
          stroke: '#0f172a',
          strokeWidth: 4,
        },
      },
    ])

    const themeDisabled = createChartScene(
      defineChart({ ...spec, theme: { focusRing: false } }),
      { width: 320, height: 180 },
    )
    expect(focusDots(themeDisabled)).toHaveLength(0)

    const definitionOptions = createChartScene(
      defineChart({
        ...spec,
        theme: { focusRing: false },
        focusRing: { radius: 3, strokeWidth: 1 },
      }),
      { width: 320, height: 180 },
    )
    expect(
      focusDots(definitionOptions).map((node) => ({
        radius: node.radius,
        style: node.style,
      })),
    ).toEqual([
      {
        radius: 3,
        style: {
          fill: 'var(--ts-chart-focus-fill, Canvas)',
          stroke: 'var(--ts-chart-1, #2563eb)',
          strokeWidth: 1,
        },
      },
      {
        radius: 3,
        style: {
          fill: 'var(--ts-chart-focus-fill, Canvas)',
          stroke: 'var(--ts-chart-1, #2563eb)',
          strokeWidth: 1,
        },
      },
    ])

    const definitionDisabled = createChartScene(
      defineChart({
        ...spec,
        theme: { focusRing: { radius: 8 } },
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    expect(focusDots(definitionDisabled)).toHaveLength(0)

    const definitionEnabled = createChartScene(
      defineChart({
        ...spec,
        theme: { focusRing: false },
        focusRing: true,
      }),
      { width: 320, height: 180 },
    )
    expect(focusDots(definitionEnabled).map((node) => node.radius)).toEqual([
      5, 5,
    ])

    for (const invalid of [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      const invalidTheme = createChartScene(
        defineChart({
          ...spec,
          theme: {
            focusRing: { radius: invalid, strokeWidth: invalid },
          },
        }),
        { width: 320, height: 180 },
      )
      expect(
        focusDots(invalidTheme).map((node) => ({
          radius: node.radius,
          strokeWidth: node.style?.strokeWidth,
        })),
      ).toEqual([
        { radius: 5, strokeWidth: 2.5 },
        { radius: 5, strokeWidth: 2.5 },
      ])
    }
  })

  it('rejects duplicate control ids', () => {
    const behavior = { id: 'duplicate', resolve: () => ({}) }

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 3, 2])],
          controls: [behavior, behavior],
          ...linearAxes([0, 2], [0, 3]),
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('Duplicate chart control id "duplicate"')
  })

  it('rejects duplicate host-control identities from behavior output', () => {
    const extension = { id: 'duplicate-control', create: () => ({}) }

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 3, 2])],
          controls: [
            {
              id: 'controls',
              resolve: () => ({
                controls: [
                  { key: 'overlay', extension },
                  { key: 'overlay', extension },
                ],
              }),
            },
          ],
          ...linearAxes([0, 2], [0, 3]),
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('Duplicate chart host control "duplicate-control:overlay"')
  })

  it('uses the public custom-mark protocol for extension', () => {
    const threshold = createMark<{ limit: number }>(() => ({
      id: 'threshold',
      channels: {
        y: { scale: 'y', values: [15] },
      },
      render: ({ chart, scales, theme }) => ({
        nodes: [
          {
            kind: 'rule',
            key: 'threshold:15',
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: scales.y.map(15),
            y2: scales.y.map(15),
            style: {
              stroke: theme.foreground,
              strokeOpacity: 0.5,
            },
          },
        ],
      }),
    }))
    const definition = defineChart({
      marks: [
        lineY(
          [
            { x: 0, y: 10 },
            { x: 1, y: 20 },
          ],
          { x: 'x', y: 'y' },
        ),
        threshold,
      ],
      ...linearAxes([0, 1], [0, 20]),
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<{ x: number; y: number } | { limit: number }>
    >()
    expect(
      flatten(scene.nodes).some((node) => node.key === 'threshold:15'),
    ).toBe(true)
  })

  it('infers raw static and responsive specs before checking behaviors', () => {
    const primary = [{ id: 'a', x: 0, y: 1 }]
    const secondary = [{ name: 'b', x: 1, value: 2 }]
    const marks = [
      lineY(primary, { x: 'x', y: 'y' }),
      lineY(secondary, { x: 'x', y: 'value' }),
    ] as const
    const tooltipExtension = {
      id: 'test-tooltip',
      create() {},
      __chartExtensionType: 'tooltip',
      __chartTooltipHost: 'dom',
    } as const
    const staticDefinition = defineChart(
      { marks, ...linearAxes([0, 1], [0, 2]) },
      {
        keyboard: true,
        tooltip: {
          use: tooltipExtension,
          format: ({ datum }) => ('id' in datum ? datum.id : datum.name),
        },
      },
    )
    const responsiveDefinition = defineChart(
      () => ({ marks, ...linearAxes([0, 1], [0, 2]) }),
      {
        keyboard: true,
        tooltip: {
          use: tooltipExtension,
          format: ({ datum }) => ('id' in datum ? datum.id : datum.name),
        },
      },
    )

    type Datum = (typeof primary)[number] | (typeof secondary)[number]
    expectTypeOf(staticDefinition).toMatchTypeOf<ChartDefinition<Datum>>()
    expectTypeOf(responsiveDefinition).toMatchTypeOf<ChartDefinition<Datum>>()
    expect(responsiveDefinition.chart).toBeTypeOf('function')
    expect(responsiveDefinition.keyboard).toBe(true)
    expect(responsiveDefinition.tooltip).toMatchObject({
      use: tooltipExtension,
    })
  })

  it('collects dense channels and interaction points without argument spreading', () => {
    const count = 200_000
    const values = Array<number>(count).fill(0)
    const point: ChartPoint<number> = {
      key: 'dense',
      markId: 'dense',
      group: null,
      groupLabel: 'dense',
      datum: 0,
      datumIndex: 0,
      xValue: 0,
      yValue: 0,
      x: 0,
      y: 0,
      color: '#2563eb',
    }
    const points = Array<ChartPoint<number>>(count).fill(point)
    const dense = createMark<number>(() => ({
      id: 'dense',
      channels: {
        x: { scale: 'x', values },
      },
      render: () => ({ nodes: [], points }),
    }))

    const scene = createChartScene(
      defineChart({
        marks: [dense],
        ...linearAxes([0, 1], [0, 1]),
        guides: false,
      }),
      { width: 100, height: 60 },
    )

    expect(scene.points).toHaveLength(count)
  })

  it('finds the nearest original datum', () => {
    const datum = { at: new Date('2026-01-01T00:00:00Z'), value: 12 }
    const scene = createChartScene(
      defineChart({
        marks: [lineY([datum], { x: 'at', y: 'value' })],
        ...utcXAxes(
          [new Date('2025-12-31T00:00:00Z'), new Date('2026-01-02T00:00:00Z')],
          [0, 12],
        ),
      }),
      { width: 400, height: 240 },
    )
    const point = scene.points[0]

    expect(findNearestPoint(scene, point.x + 2, point.y + 1, 8)?.datum).toBe(
      datum,
    )
    expect(findNearestPoint(scene, 0, 0, 8)).toBeNull()
  })

  it('translates one clipped content path while guides stay fixed', () => {
    const rows = [0, 10, 20, 30].map((x) => ({ id: String(x), x, y: x / 3 }))
    const makeScene = (translate: number) =>
      createChartScene(
        defineChart({
          marks: [
            lineY(rows, {
              id: 'history',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          scales: {
            x: {
              scale: linearAxes([0, 30], [0, 10]).scales.x.scale,
              viewport: { domain: [10, 20], translate },
              grid: true,
            },
            y: { ...linearAxes([0, 30], [0, 10]).scales.y, grid: true },
          },
        }),
        { width: 480, height: 260 },
      )

    const settled = makeScene(0)
    const dragged = makeScene(40)
    const settledMarks = settled.nodes.find((node) => node.key === 'marks')
    const draggedMarks = dragged.nodes.find((node) => node.key === 'marks')
    if (settledMarks?.kind !== 'group' || draggedMarks?.kind !== 'group') {
      throw new Error('Expected mark groups')
    }
    const settledClip = settledMarks.children[0]
    const draggedClip = draggedMarks.children[0]
    const settledContent =
      settledClip?.kind === 'group' ? settledClip.children[0] : undefined
    const draggedContent =
      draggedClip?.kind === 'group' ? draggedClip.children[0] : undefined
    if (
      settledClip?.kind !== 'group' ||
      draggedClip?.kind !== 'group' ||
      settledContent?.kind !== 'group' ||
      draggedContent?.kind !== 'group'
    ) {
      throw new Error('Expected clipped viewport content groups')
    }
    const settledLine = flatten(settledContent.children).find(
      (node) => node.kind === 'polyline',
    )
    const draggedLine = flatten(draggedContent.children).find(
      (node) => node.kind === 'polyline',
    )
    if (settledLine?.kind !== 'polyline' || draggedLine?.kind !== 'polyline') {
      throw new Error('Expected history paths')
    }

    expect(settledMarks.clip).toBeUndefined()
    expect(draggedMarks.clip).toBeUndefined()
    expect(settledClip.clip).toEqual(settled.chart)
    expect(draggedClip.clip).toEqual(dragged.chart)
    expect(settledContent.key).toBe('viewport-content:history')
    expect(settledContent.translateX).toBe(0)
    expect(draggedContent.translateX).toBe(40)
    expect(draggedLine.path).toBe(settledLine.path)
    expect(draggedLine.points).toEqual(settledLine.points)
    expect(dragged.points.map((point) => point.x)).toEqual(
      settled.points.map((point) => point.x + 40),
    )
    expect(dragged.nodes.find((node) => node.key === 'grid')).toEqual(
      settled.nodes.find((node) => node.key === 'grid'),
    )
    expect(dragged.nodes.find((node) => node.key === 'axes')).toEqual(
      settled.nodes.find((node) => node.key === 'axes'),
    )

    const visiblePoints = viewportInteractionPoints(dragged)
    expect(visiblePoints.length).toBeLessThan(dragged.points.length)
    expect(
      visiblePoints.every(
        (point) =>
          point.x >= dragged.chart.x &&
          point.x <= dragged.chart.x + dragged.chart.width,
      ),
    ).toBe(true)
    expect(viewportInteractionPoints(dragged, visiblePoints)).toBe(
      visiblePoints,
    )

    const visible = dragged.points.find((point) => point.datum.x === 10)!
    expect(findNearestPoint(dragged, visible.x, visible.y, 1)?.datum).toBe(
      visible.datum,
    )
    const interaction = draggedLine.interaction
    expect(interaction?.points).toBeDefined()
    if (!interaction?.points) return
    expect(interaction.points[0]?.x).toBe(dragged.points[0]?.x)
    expect(draggedLine.points[0]?.[0]).toBe(settled.points[0]?.x)

    const container = document.createElement('div')
    container.innerHTML = renderChartSvg(dragged, {
      ariaLabel: 'Paged history',
      idPrefix: 'history',
    })
    const marks = container.querySelector<SVGGElement>('g.ts-chart__marks')
    const viewportClip = marks?.querySelector<SVGGElement>(
      'g.ts-chart__viewport-clip',
    )
    const clip = viewportClip?.querySelector('clipPath rect')
    expect(settledLine.points[0]?.[0]).toBeLessThan(settled.chart.x)
    expect(settledLine.points.at(-1)?.[0]).toBeGreaterThan(
      settled.chart.x + settled.chart.width,
    )
    expect(marks?.getAttribute('clip-path')).toBeNull()
    expect(viewportClip?.getAttribute('clip-path')).toMatch(
      /^url\(#history-ts-chart-clip-/,
    )
    expect(Number(clip?.getAttribute('x'))).toBeCloseTo(dragged.chart.x)
    expect(Number(clip?.getAttribute('width'))).toBeCloseTo(dragged.chart.width)
    expect(marks?.querySelector('g.ts-chart__viewport-content path')).not.toBe(
      null,
    )
    expect(marks?.querySelector('[data-ts-key="axes"]')).toBeNull()
  })

  it('translates only marks that depend on the viewport axis', () => {
    const history = [0, 5, 10].map((x) => ({ id: String(x), x, y: x }))
    const axes = linearAxes([0, 10], [0, 10])
    const xScene = createChartScene(
      defineChart({
        marks: [
          frame({ id: 'plot-frame' }),
          bandY([{ id: 'target-y', y: 5 }], {
            id: 'target-y',
            y: 'y',
            key: 'id',
            height: 2,
          }),
          lineY(history, { id: 'history-x', x: 'x', y: 'y', key: 'id' }),
        ],
        scales: {
          x: {
            scale: axes.scales.x.scale,
            viewport: { domain: [2, 8], translate: 36 },
          },
          y: axes.scales.y,
        },
        guides: false,
      }),
      { width: 480, height: 260 },
    )
    const yScene = createChartScene(
      defineChart({
        marks: [
          frame({ id: 'plot-frame' }),
          bandX([{ id: 'target-x', x: 5 }], {
            id: 'target-x',
            x: 'x',
            key: 'id',
            width: 2,
          }),
          lineY(history, { id: 'history-y', x: 'x', y: 'y', key: 'id' }),
        ],
        scales: {
          x: axes.scales.x,
          y: {
            scale: axes.scales.y.scale,
            viewport: { domain: [2, 8], translate: -24 },
          },
        },
        guides: false,
      }),
      { width: 480, height: 260 },
    )
    const settled = (axis: 'x' | 'y') =>
      createChartScene(
        defineChart({
          marks: [
            frame({ id: 'plot-frame' }),
            axis === 'x'
              ? bandY([{ id: 'target-y', y: 5 }], {
                  id: 'target-y',
                  y: 'y',
                  key: 'id',
                  height: 2,
                })
              : bandX([{ id: 'target-x', x: 5 }], {
                  id: 'target-x',
                  x: 'x',
                  key: 'id',
                  width: 2,
                }),
            lineY(history, {
              id: `history-${axis}`,
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          scales: {
            x:
              axis === 'x'
                ? {
                    scale: axes.scales.x.scale,
                    viewport: { domain: [2, 8], translate: 0 },
                  }
                : axes.scales.x,
            y:
              axis === 'y'
                ? {
                    scale: axes.scales.y.scale,
                    viewport: { domain: [2, 8], translate: 0 },
                  }
                : axes.scales.y,
          },
          guides: false,
        }),
        { width: 480, height: 260 },
      )

    const inspect = (
      scene: ChartScene,
      translatedAxis: 'x' | 'y',
      fixedClass: string,
    ) => {
      const nodes = flatten(scene.nodes)
      const content = nodes.find(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__viewport-content'),
      )
      if (content?.kind !== 'group') {
        throw new Error('Expected axis-specific viewport content')
      }
      const translated = flatten(content.children)
      expect(
        translated.some(
          (node) =>
            node.kind === 'group' && node.className?.includes('ts-chart__line'),
        ),
      ).toBe(true)
      expect(
        translated.some(
          (node) =>
            node.kind === 'group' && node.className?.includes(fixedClass),
        ),
      ).toBe(false)
      expect(
        nodes.some(
          (node) =>
            node.kind === 'group' && node.className?.includes(fixedClass),
        ),
      ).toBe(true)
      expect(
        nodes.some(
          (node) =>
            node.kind === 'group' &&
            node.className?.includes('ts-chart__frame'),
        ),
      ).toBe(true)
      expect(
        translated.some(
          (node) =>
            node.kind === 'group' &&
            node.className?.includes('ts-chart__frame'),
        ),
      ).toBe(false)
      expect(content.translateX).toBe(translatedAxis === 'x' ? 36 : undefined)
      expect(content.translateY).toBe(translatedAxis === 'y' ? -24 : undefined)
    }

    inspect(xScene, 'x', 'ts-chart__band-y')
    inspect(yScene, 'y', 'ts-chart__band-x')
    const fixedNode = (scene: ChartScene, className: string) =>
      flatten(scene.nodes).find(
        (node) => node.kind === 'group' && node.className?.includes(className),
      )
    expect(fixedNode(xScene, 'ts-chart__band-y')).toEqual(
      fixedNode(settled('x'), 'ts-chart__band-y'),
    )
    expect(fixedNode(yScene, 'ts-chart__band-x')).toEqual(
      fixedNode(settled('y'), 'ts-chart__band-x'),
    )
    expect(fixedNode(xScene, 'ts-chart__frame')).toEqual(
      fixedNode(settled('x'), 'ts-chart__frame'),
    )
  })

  it('keeps per-mark viewport group keys stable as siblings change', () => {
    const rows = [0, 5, 10].map((x) => ({ id: String(x), x, y: x }))
    const makeScene = (withLeadingMarks: boolean) =>
      createChartScene(
        defineChart({
          marks: [
            ...(withLeadingMarks
              ? [
                  lineY(rows, { id: 'history-a', x: 'x', y: 'y', key: 'id' }),
                  frame({ id: 'plot-frame' }),
                ]
              : []),
            lineY(rows, { id: 'history-b', x: 'x', y: 'y', key: 'id' }),
          ],
          scales: {
            x: {
              scale: linearAxes([0, 10], [0, 10]).scales.x.scale,
              viewport: { domain: [2, 8], translate: 12 },
            },
            y: linearAxes([0, 10], [0, 10]).scales.y,
          },
          guides: false,
        }),
        { width: 480, height: 260 },
      )
    const keys = (scene: ChartScene) =>
      flatten(scene.nodes)
        .filter(
          (node) =>
            node.kind === 'group' &&
            node.className?.includes('ts-chart__viewport-content'),
        )
        .map((node) => node.key)

    expect(keys(makeScene(true))).toEqual([
      'viewport-content:history-a',
      'viewport-content:history-b',
    ])
    expect(keys(makeScene(false))).toEqual(['viewport-content:history-b'])
  })

  it('lets custom marks declare fixed or content viewport ownership', () => {
    const annotation = (
      id: string,
      ownership: 'fixed' | 'content',
      contributesDomain: boolean,
    ) =>
      createMark<never, number, number>(() => ({
        id,
        channels: {
          x: { scale: 'x', values: contributesDomain ? [0, 10] : [] },
        },
        viewport: { x: ownership },
        render: ({ chart }) => ({
          nodes: [
            {
              kind: 'group',
              key: id,
              className: id,
              children: [
                {
                  kind: 'rule',
                  key: `${id}:rule`,
                  x1: chart.x,
                  x2: chart.x + chart.width,
                  y1: chart.y,
                  y2: chart.y,
                },
              ],
            },
          ],
        }),
      }))
    const resolved = createChartScene(
      defineChart({
        marks: [
          annotation('fixed-annotation', 'fixed', true),
          annotation('content-annotation', 'content', false),
        ],
        scales: {
          x: {
            scale: linearAxes([0, 10], [0, 1]).scales.x.scale,
            viewport: { domain: [2, 8], translate: 20 },
          },
          y: linearAxes([0, 10], [0, 1]).scales.y,
        },
        guides: false,
      }),
      { width: 480, height: 260 },
    )
    const marks = resolved.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected marks')
    const content = flatten(marks.children).find(
      (node) =>
        node.kind === 'group' && node.className === 'content-annotation',
    )
    const fixed = flatten(marks.children).find(
      (node) => node.kind === 'group' && node.className === 'fixed-annotation',
    )
    const viewport = flatten(marks.children).find(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__viewport-content'),
    )
    if (viewport?.kind !== 'group') throw new Error('Expected viewport group')

    expect(content).toBeDefined()
    expect(fixed).toBeDefined()
    expect(flatten(viewport.children)).toContain(content)
    expect(flatten(viewport.children)).not.toContain(fixed)
    expect(viewport.translateX).toBe(20)
  })

  it('keeps fixed mark points interactive outside another mark viewport', () => {
    const fixed = createMark<never, number, number>(() => ({
      id: 'fixed-annotation',
      channels: {},
      viewport: { x: 'fixed', y: 'fixed' },
      render: ({ chart }) => {
        const point: ChartPoint<never, number, number> = {
          key: 'fixed-annotation:point',
          markId: 'fixed-annotation',
          group: null,
          groupLabel: 'fixed-annotation',
          datum: undefined as never,
          datumIndex: 0,
          xValue: 0,
          yValue: 5,
          x: chart.x - 20,
          y: chart.y + chart.height / 2,
          color: 'currentColor',
        }
        return {
          points: [point],
          nodes: [
            {
              kind: 'dot',
              key: point.key,
              x: point.x,
              y: point.y,
              radius: 4,
              interaction: { point },
            },
          ],
        }
      },
    }))
    const rows = [0, 5, 10].map((x) => ({ id: String(x), x, y: x }))
    const resolved = createChartScene(
      defineChart({
        marks: [
          lineY(rows, { id: 'history', x: 'x', y: 'y', key: 'id' }),
          fixed,
        ],
        scales: {
          x: {
            scale: linearAxes([0, 10], [0, 10]).scales.x.scale,
            viewport: { domain: [4, 6] },
          },
          y: linearAxes([0, 10], [0, 10]).scales.y,
        },
        guides: false,
      }),
      { width: 400, height: 200 },
    )
    const fixedPoint = resolved.points.find(
      (point) => point.markId === 'fixed-annotation',
    )
    if (!fixedPoint) throw new Error('Expected fixed annotation point')
    const visible = viewportInteractionPoints(resolved)
    const focusLayers = flatten(resolved.nodes).filter(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__focus-layer--default'),
    )
    const fixedFocus = focusLayers.find(
      (node) => node.key === 'default-focus:fixed-annotation',
    )
    const historyFocus = focusLayers.find(
      (node) => node.key === 'default-focus:history',
    )

    expect(fixedPoint.x).toBeLessThan(resolved.chart.x)
    expect(visible).toContain(fixedPoint)
    expect(fixedFocus?.kind === 'group' && fixedFocus.clip).toBeUndefined()
    expect(historyFocus?.kind === 'group' && historyFocus.clip).toEqual(
      resolved.chart,
    )
  })

  it('does not let auto-clipped off-window labels inflate layout margins', () => {
    const resolved = createChartScene(
      defineChart({
        marks: [
          text(
            [
              {
                id: 'offscreen',
                x: -100,
                y: 0.5,
                label: 'A very long historical annotation outside the window',
              },
            ],
            { x: 'x', y: 'y', text: 'label', key: 'id', anchor: 'end' },
          ),
        ],
        scales: {
          x: {
            scale: linearAxes([-100, 100], [0, 1]).scales.x.scale,
            viewport: { domain: [0, 1] },
          },
          y: linearAxes([-100, 100], [0, 1]).scales.y,
        },
        guides: false,
      }),
      { width: 400, height: 200 },
    )

    expect(resolved.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(resolved.chart).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  it('renders escaped, complete SVG without a DOM', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        ...linearAxes([0, 2], [0, 3]),
      }),
      {
        width: 480,
        height: 260,
      },
    )
    const svg = renderChartSvg(scene, {
      ariaLabel: 'Revenue <trend>',
      ariaDescription: 'A & B',
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
    expect(svg).toContain('aria-label="Revenue &lt;trend&gt;"')
    expect(svg).toContain('<desc>A &amp; B</desc>')
    expect(svg).toContain('data-ts-focus-layer="over"')
  })

  it('keeps semantic points without generated focus geometry when focus is disabled', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        ...linearAxes([0, 2], [0, 3]),
        focus: false,
      }),
      { width: 480, height: 260 },
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Static trend' })

    expect(scene.points).toHaveLength(3)
    expect(scene.points.map((point) => point.datum)).toEqual([1, 3, 2])
    expect(svg).not.toContain('data-ts-focus-layer')
  })

  it('inherits shared grid presentation attributes from one group', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        scales: {
          x: { ...linearAxes([0, 2], [0, 3]).scales.x, grid: true },
          y: { ...linearAxes([0, 2], [0, 3]).scales.y, grid: true },
        },
      }),
      { width: 480, height: 260 },
    )
    const grid = scene.nodes.find(
      (node) => node.kind === 'group' && node.key === 'grid',
    )
    if (!grid || grid.kind !== 'group') throw new Error('Expected grid group')

    expect(grid.style).toEqual({
      stroke: 'currentColor',
      strokeOpacity: 0.11,
      strokeWidth: 1,
    })
    expect(grid.children.length).toBeGreaterThan(0)
    expect(grid.children.every((node) => node.style === undefined)).toBe(true)

    const container = document.createElement('div')
    container.innerHTML = renderChartSvg(scene, { ariaLabel: 'Grid' })
    const renderedGrid = container.querySelector('[data-ts-key="grid"]')
    const renderedRules = renderedGrid?.querySelectorAll('line')
    expect(renderedGrid?.getAttribute('stroke')).toBe('currentColor')
    expect(renderedGrid?.getAttribute('stroke-opacity')).toBe('0.11')
    expect(renderedGrid?.getAttribute('stroke-width')).toBe('1')
    expect(renderedRules?.length).toBeGreaterThan(0)
    for (const rule of renderedRules ?? []) {
      expect(rule.hasAttribute('stroke')).toBe(false)
      expect(rule.hasAttribute('stroke-opacity')).toBe(false)
      expect(rule.hasAttribute('stroke-width')).toBe(false)
    }
  })

  it('mounts, updates, interacts, and destroys through vanilla TypeScript', () => {
    const firstDatum = { id: 'a', x: 0, y: 10 }
    const definition = defineChart({
      marks: [
        lineY([firstDatum], {
          x: 'x',
          y: 'y',
          key: 'id',
          points: true,
        }),
      ],
      ...linearAxes([0, 1], [0, 10]),
    })
    const onFocusChange = vi.fn()
    const container = document.createElement('div')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      maxFocusDistance: 1_000,
      onFocusChange,
    }
    const host = mountChart(container, options)
    const point = host.getScene().points[0]
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: point.x,
        clientY: point.y,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(firstDatum)

    host.update({
      ...options,
      ariaLabel: 'Updated revenue',
    })
    expect(container.innerHTML).toContain('Updated revenue')
    expect(
      container
        .querySelector('[data-ts-focus-layer]')
        ?.getAttribute('visibility'),
    ).toBe('visible')
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(firstDatum)

    host.destroy()
    expect(container.childNodes).toHaveLength(0)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
