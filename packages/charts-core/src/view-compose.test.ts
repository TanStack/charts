import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { createChartCursor, cursorHost } from './cursor'
import { dot } from './dot'
import { motion } from './motion'
import { pie, polar, radialArc } from './polar'
import { createChartScene, defineChart, findNearestPoint } from './scene'
import { renderChartSvg } from './svg'
import {
  alignX,
  alignY,
  composeViews,
  fill,
  grid,
  inset,
  layer,
  shareX,
  shareY,
  viewGrid,
} from './view'
import type {
  ChartColorLegend,
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
  SceneGroup,
  SceneNode,
  StaticChartDefinition,
} from './types'
import type { ComposeViewsOptions, ViewScaleLink } from './view'
import type { PieDatum } from './polar'

interface MainRow {
  readonly kind: 'main'
  readonly id: string
  readonly at: Date
  readonly value: number
}

interface SliceRow {
  readonly kind: 'slice'
  readonly id: string
  readonly label: string
  readonly value: number
}

const mainRows: readonly MainRow[] = [
  {
    kind: 'main',
    id: 'first',
    at: new Date('2026-01-01T00:00:00Z'),
    value: 2,
  },
  {
    kind: 'main',
    id: 'second',
    at: new Date('2026-01-02T00:00:00Z'),
    value: 8,
  },
]

const sliceRows: readonly SliceRow[] = [
  { kind: 'slice', id: 'complete', label: 'Complete', value: 7 },
  { kind: 'slice', id: 'remaining', label: 'Remaining', value: 3 },
]

describe('composed views', () => {
  it('resolves responsive children against their allocated frames', () => {
    const contexts: Array<{
      width: number
      height: number
      foreground: string
    }> = []
    const responsive = defineChart(({ width, height, defaultTheme }) => {
      contexts.push({
        width,
        height,
        foreground: defaultTheme.foreground,
      })
      return {
        marks: [dot([{ x: width, y: height }], { x: 'x', y: 'y' })],
        x: { scale: scaleLinear().domain([0, width]) },
        y: { scale: scaleLinear().domain([0, height]) },
        guides: false,
        margin: 0,
      }
    })
    const definition = composeViews({
      views: { responsive },
      layout: fill('responsive'),
    })

    const scene = createChartScene(
      { ...definition, theme: { foreground: '#123456' } },
      { width: 120, height: 80 },
    )

    expect(contexts).toEqual([
      { width: 120, height: 80, foreground: '#123456' },
    ])
    expect(scene.points).toHaveLength(1)
  })

  it('layers a polar donut inset over a Cartesian view with one stable scene', () => {
    const { definition, arcs } = mixedDefinition()
    type Datum = ChartSpecDatum<typeof definition>
    type XValue = ChartSpecXValue<typeof definition>
    type YValue = ChartSpecYValue<typeof definition>
    expectTypeOf<Datum>().toEqualTypeOf<MainRow | PieDatum<SliceRow>>()
    expectTypeOf<XValue>().toEqualTypeOf<Date | number>()
    expectTypeOf<YValue>().toEqualTypeOf<number>()

    const scene = createChartScene(definition, { width: 600, height: 400 })
    const views = directViewGroups(scene.nodes)

    expect(views.map((view) => view.key)).toEqual([
      'dashboard:main:view',
      'dashboard:summary:view',
    ])
    expect(views[0]).toMatchObject({
      translateX: 0,
      translateY: 0,
      clip: { x: 0, y: 0, width: 600, height: 400 },
    })
    expect(views[1]).toMatchObject({
      translateX: 428,
      translateY: 12,
      clip: { x: 0, y: 0, width: 160, height: 160 },
    })
    expect(new Set(scene.points.map((point) => point.markId))).toEqual(
      new Set([
        'dashboard:main:observations',
        'dashboard:summary:summary-arcs',
      ]),
    )
    expect(scene.points.some((point) => point.datum === mainRows[0])).toBe(true)
    expect(scene.points.some((point) => point.datum === arcs[0])).toBe(true)
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(
      scene.points.length,
    )
    expect(
      flatten(scene.nodes).filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__focus-layer--default'),
      ),
    ).toHaveLength(1)
  })

  it('renders translated and clipped heterogeneous views through static SVG', () => {
    const { definition } = mixedDefinition()
    const scene = createChartScene(definition, { width: 600, height: 400 })
    const container = document.createElement('div')
    container.innerHTML = renderChartSvg(scene, {
      ariaLabel: 'Composed dashboard',
    })

    const main = container.querySelector<SVGGElement>(
      'g[data-ts-key="dashboard:main:view"]',
    )
    const summary = container.querySelector<SVGGElement>(
      'g[data-ts-key="dashboard:summary:view"]',
    )

    expect(main?.getAttribute('transform')).toBe('translate(0 0)')
    expect(main?.getAttribute('clip-path')).toMatch(/^url\(#.+\)$/)
    expect(clipAttributes(main)).toEqual(['0', '0', '600', '400'])
    expect(main?.querySelector('circle')).not.toBeNull()

    expect(summary?.getAttribute('transform')).toBe('translate(428 12)')
    expect(summary?.getAttribute('clip-path')).toMatch(/^url\(#.+\)$/)
    expect(clipAttributes(summary)).toEqual(['0', '0', '160', '160'])
    expect(summary?.querySelector('path')).not.toBeNull()
  })

  it('keeps composed-view point namespaces during a motion update', () => {
    const updatedRows: readonly MainRow[] = [
      { ...mainRows[0]!, value: 7 },
      { ...mainRows[1]!, value: 3 },
    ]
    const first = createChartScene(mixedDefinition().definition, {
      width: 600,
      height: 400,
    })
    const next = createChartScene(mixedDefinition(updatedRows).definition, {
      width: 600,
      height: 400,
    })
    const container = document.createElement('div')
    const surface = motion({
      initial: false,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Composed dashboard' })
    const frames = installManagedFrames()

    try {
      surface.render(next, { ariaLabel: 'Updated composed dashboard' })

      expectPresentationNamespaces(surface.getPresentationPoints?.(), next)
      expect(
        container
          .querySelector('g[data-ts-key="dashboard:summary:view"]')
          ?.getAttribute('transform'),
      ).toBe('translate(428 12)')
      expect(
        container
          .querySelector('g[data-ts-key="dashboard:summary:view"]')
          ?.getAttribute('clip-path'),
      ).toMatch(/^url\(#.+\)$/)

      frames.run(0)
      frames.run(50)
      expectPresentationNamespaces(surface.getPresentationPoints?.(), next)

      frames.run(100)
      expect(surface.getPresentationPoints?.()).toBeUndefined()
      expect(
        container.querySelector('g[data-ts-key="dashboard:main:view"] circle'),
      ).not.toBeNull()
      expect(
        container.querySelector('g[data-ts-key="dashboard:summary:view"] path'),
      ).not.toBeNull()
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('shrinks an inset proportionally while preserving namespaced keys', () => {
    const { definition } = mixedDefinition()
    const large = createChartScene(definition, { width: 600, height: 400 })
    const small = createChartScene(definition, { width: 100, height: 80 })
    const [smallMain, smallSummary] = directViewGroups(small.nodes)
    const ratio = 80 / (160 + 12 * 2)

    expect(smallMain).toMatchObject({
      translateX: 0,
      translateY: 0,
      clip: { x: 0, y: 0, width: 100, height: 80 },
    })
    expect(smallSummary?.clip?.width).toBeCloseTo(160 * ratio, 8)
    expect(smallSummary?.clip?.height).toBeCloseTo(160 * ratio, 8)
    expect(smallSummary?.translateX).toBeCloseTo(
      100 - 12 * ratio - 160 * ratio,
      8,
    )
    expect(smallSummary?.translateY).toBeCloseTo(12 * ratio, 8)
    expect(small.points.map((point) => point.key)).toEqual(
      large.points.map((point) => point.key),
    )
    expect(directViewGroups(small.nodes).map((view) => view.key)).toEqual(
      directViewGroups(large.nodes).map((view) => view.key),
    )
  })

  it('uses reverse paint order while transparent inset space passes through', () => {
    const centerRow = { id: 'center', x: 5, y: 5 }
    const arcs = pie(sliceRows, { value: 'value' })
    const definition = composeViews({
      id: 'pass-through',
      views: {
        main: defineChart({
          marks: [dot([centerRow], { id: 'center-dot', x: 'x', y: 'y' })],
          x: { scale: scaleLinear().domain([0, 10]) },
          y: { scale: scaleLinear().domain([0, 10]) },
          guides: false,
          margin: 0,
        }),
        summary: defineChart({
          marks: [
            polar({
              marks: [
                radialArc(arcs, {
                  id: 'ring',
                  key: 'id',
                  innerRadius: ({ radius }) => radius * 0.55,
                }),
              ],
            }),
          ],
          x: null,
          y: null,
          guides: false,
          margin: 0,
        }),
      },
      layout: layer(
        fill('main'),
        inset('summary', {
          relativeTo: 'main',
          anchor: 'center',
          width: 200,
          height: 200,
        }),
      ),
    })
    const scene = createChartScene(definition, { width: 200, height: 200 })
    const mainPoint = scene.points.find(
      (point) => point.markId === 'pass-through:main:center-dot',
    )!
    const summaryPoint = scene.points.find(
      (point) => point.markId === 'pass-through:summary:ring',
    )!

    expect(findNearestPoint(scene, mainPoint.x, mainPoint.y)?.datum).toBe(
      centerRow,
    )
    expect(findNearestPoint(scene, summaryPoint.x, summaryPoint.y)?.datum).toBe(
      summaryPoint.datum,
    )
  })

  it('matches viewGrid scene output for the equivalent grid and links', () => {
    const overview = linearChild([0, 10])
    const detail = linearChild([0, 10])
    const rows = [
      { id: 'overview', size: 64 },
      { id: 'detail', grow: 1 },
    ] as const
    const columns = [{ id: 'main', grow: 1 }] as const
    const composed = composeViews({
      id: 'parity',
      views: { overview, detail },
      layout: grid({
        rows,
        columns,
        gap: 8,
        cells: {
          overview: { row: 'overview', column: 'main' },
          detail: { row: 'detail', column: 'main' },
        },
      }),
      links: [shareX('overview', 'detail')],
    })
    const wrapped = viewGrid({
      id: 'parity',
      rows,
      columns,
      gap: 8,
      views: [
        {
          id: 'overview',
          row: 'overview',
          column: 'main',
          share: { x: 'detail' },
          chart: overview,
        },
        {
          id: 'detail',
          row: 'detail',
          column: 'main',
          chart: detail,
        },
      ],
    })
    const composedScene = createChartScene(composed, {
      width: 420,
      height: 280,
    })
    const wrappedScene = createChartScene(wrapped, {
      width: 420,
      height: 280,
    })

    expect(composedScene.nodes).toEqual(wrappedScene.nodes)
    expect(composedScene.points).toEqual(wrappedScene.points)
    expect(composedScene.chart).toEqual(wrappedScene.chart)
  })

  it('keeps scale links explicit and rejects incompatible allocated frames', () => {
    expect(shareX('top', 'bottom')).toEqual({
      source: 'top',
      target: 'bottom',
      axis: 'x',
      mode: 'share',
    })
    expect(shareY('left', 'right')).toEqual({
      source: 'left',
      target: 'right',
      axis: 'y',
      mode: 'share',
    })
    expect(alignX('top', 'bottom')).toEqual({
      source: 'top',
      target: 'bottom',
      axis: 'x',
      mode: 'align',
    })
    expect(alignY('left', 'right')).toEqual({
      source: 'left',
      target: 'right',
      axis: 'y',
      mode: 'align',
    })

    const top = linearChild([0, 100])
    const bottom = linearChild([0, 10])
    const rows = grid({
      rows: [
        { id: 'top', grow: 1 },
        { id: 'bottom', grow: 1 },
      ],
      columns: [{ id: 'main', grow: 1 }],
      cells: {
        top: { row: 'top', column: 'main' },
        bottom: { row: 'bottom', column: 'main' },
      },
      gap: 0,
    })
    const aligned = composeViews({
      views: { top, bottom },
      layout: rows,
      links: [alignX('top', 'bottom')],
    })
    expect(() =>
      createChartScene(aligned, { width: 400, height: 260 }),
    ).not.toThrow()

    const shared = composeViews({
      views: { top, bottom: linearChild([0, 100]) },
      layout: rows,
      links: [shareX('top', 'bottom')],
    })
    expect(() =>
      createChartScene(shared, { width: 400, height: 260 }),
    ).not.toThrow()

    const mismatched = composeViews({
      views: { top, bottom },
      layout: rows,
      links: [shareX('top', 'bottom')],
    })
    expect(() =>
      createChartScene(mismatched, { width: 400, height: 260 }),
    ).toThrow(/resolved domains differ/)

    const overlapping = composeViews({
      views: { top, bottom: linearChild([0, 100]) },
      layout: layer(
        fill('top'),
        inset('bottom', {
          relativeTo: 'top',
          anchor: 'top-right',
          width: 120,
          height: 90,
          offset: 8,
        }),
      ),
      links: [shareX('top', 'bottom')],
    })
    expect(() =>
      createChartScene(overlapping, { width: 400, height: 260 }),
    ).toThrow(/allocated horizontal frames differ/)
  })

  it('validates forged layouts and layout dependency order at runtime', () => {
    const chart = linearChild([0, 10])

    expect(() =>
      unsafeCompose({
        views: { main: chart },
        layout: fill('ghost'),
      }),
    ).toThrow(/places unknown view "ghost"/)
    expect(() =>
      unsafeCompose({
        views: { main: chart, summary: chart },
        layout: fill('main'),
      }),
    ).toThrow(/does not place named view "summary"/)
    expect(() => {
      const definition = unsafeCompose({
        views: { main: chart },
        layout: layer(fill('main'), fill('main')),
      })
      createChartScene(definition, { width: 300, height: 200 })
    }).toThrow(/places "main" more than once/)
    expect(() => {
      const definition = unsafeCompose({
        views: { main: chart, summary: chart },
        layout: layer(
          inset('summary', {
            relativeTo: 'main',
            anchor: 'center',
            width: 80,
            height: 80,
          }),
          fill('main'),
        ),
      })
      createChartScene(definition, { width: 300, height: 200 })
    }).toThrow(/must target an earlier resolved view/)
  })

  it('rejects invalid forged scale-link values', () => {
    const views = {
      top: linearChild([0, 10]),
      bottom: linearChild([0, 10]),
    }
    const layout = grid({
      rows: [
        { id: 'top', grow: 1 },
        { id: 'bottom', grow: 1 },
      ],
      columns: [{ id: 'main', grow: 1 }],
      cells: {
        top: { row: 'top', column: 'main' },
        bottom: { row: 'bottom', column: 'main' },
      },
    })

    expect(() =>
      unsafeCompose({
        views,
        layout,
        links: [
          forgedLink({
            source: 'top',
            target: 'bottom',
            axis: 'depth',
            mode: 'share',
          }),
        ],
      }),
    ).toThrow(/axis/)
    expect(() =>
      unsafeCompose({
        views,
        layout,
        links: [
          forgedLink({
            source: 'top',
            target: 'bottom',
            axis: 'x',
            mode: 'merge',
          }),
        ],
      }),
    ).toThrow(/mode/)
  })

  it('rejects child-owned host state, backgrounds, and compiled controls', () => {
    const child = linearChild([0, 10])
    const selectionChild = {
      ...child,
      selection: { type: 'keyed', change: () => undefined },
    } as unknown as StaticChartDefinition
    const behaviorChild = {
      ...child,
      controls: [{ id: 'child-behavior', resolve: () => ({}) }],
    } as unknown as StaticChartDefinition
    const cursorChild = {
      ...child,
      cursor: {
        use: cursorHost,
        controller: createChartCursor<number, number>(),
        mode: 'focus',
      },
    } as unknown as StaticChartDefinition
    const pointerChild = {
      ...child,
      pointer: false,
    } as unknown as StaticChartDefinition
    const backgroundChild = {
      ...child,
      theme: { background: '#fff' },
    } as unknown as StaticChartDefinition

    expect(() =>
      unsafeCompose({
        views: { child: selectionChild },
        layout: fill('child'),
      }),
    ).toThrow(/host option "selection"/)
    expect(() =>
      unsafeCompose({
        views: { child: behaviorChild },
        layout: fill('child'),
      }),
    ).toThrow(/host option "controls"/)
    expect(() =>
      unsafeCompose({
        views: { child: cursorChild },
        layout: fill('child'),
      }),
    ).toThrow(/host option "cursor"/)
    expect(() =>
      unsafeCompose({
        views: { child: pointerChild },
        layout: fill('child'),
      }),
    ).toThrow(/host option "pointer"/)
    expect(() =>
      unsafeCompose({
        views: { child: backgroundChild },
        layout: fill('child'),
      }),
    ).toThrow(/cannot own a scene background/)

    const controlled = composeViews({
      views: { child: controlledLegendChild() },
      layout: fill('child'),
    })
    expect(() =>
      createChartScene(controlled, { width: 300, height: 200 }),
    ).toThrow(/cannot own host controls/)
  })

  it('rejects unknown and missing view ids at compile time', () => {
    const views = {
      main: linearChild([0, 10]),
      summary: linearChild([0, 10]),
    }
    if (false) {
      composeViews({
        views,
        // @ts-expect-error "ghost" is not a named view
        layout: layer(fill('main'), fill('ghost')),
      })
      composeViews({
        views,
        // @ts-expect-error the layout does not place "summary"
        layout: fill('main'),
      })
      composeViews({
        views,
        layout: layer(fill('main'), fill('summary')),
        // @ts-expect-error "ghost" is not a named view
        links: [shareX('ghost', 'main')],
      })
    }

    expect(Object.keys(views)).toEqual(['main', 'summary'])
  })
})

function mixedDefinition(rows: readonly MainRow[] = mainRows) {
  const arcs = pie(sliceRows, { value: 'value' })
  const main = defineChart({
    marks: [
      dot(rows, {
        id: 'observations',
        x: 'at',
        y: 'value',
        key: 'id',
      }),
    ],
    x: {
      scale: scaleUtc().domain(rows.map((row) => row.at)),
    },
    y: { scale: scaleLinear().domain([0, 10]) },
    guides: false,
    margin: 0,
  })
  const summary = defineChart({
    marks: [
      polar({
        id: 'summary-polar',
        radiusRatio: 0.9,
        marks: [
          radialArc(arcs, {
            id: 'summary-arcs',
            key: 'id',
            color: 'label',
            innerRadius: ({ radius }) => radius * 0.55,
          }),
        ],
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 0,
  })
  return {
    arcs,
    definition: composeViews({
      id: 'dashboard',
      views: { main, summary },
      layout: layer(
        fill('main'),
        inset('summary', {
          relativeTo: 'main',
          anchor: 'top-right',
          width: 160,
          height: 160,
          offset: 12,
        }),
      ),
    }),
  }
}

function expectPresentationNamespaces(
  points:
    readonly { readonly key: string; readonly markId: string }[] | undefined,
  scene: { readonly points: readonly { readonly key: string }[] },
) {
  expect(points?.map((point) => point.key)).toEqual(
    expect.arrayContaining(scene.points.map((point) => point.key)),
  )
  expect(new Set(points?.map((point) => point.markId))).toEqual(
    new Set(['dashboard:main:observations', 'dashboard:summary:summary-arcs']),
  )
}

function clipAttributes(group: SVGGElement | null) {
  const clip = group?.querySelector('clipPath rect')
  return ['x', 'y', 'width', 'height'].map((attribute) =>
    clip?.getAttribute(attribute),
  )
}

function installManagedFrames() {
  const callbacks = new Map<number, FrameRequestCallback>()
  let handle = 0
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      handle += 1
      callbacks.set(handle, callback)
      return handle
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frame) => {
      if (frame !== null && frame !== undefined) callbacks.delete(frame)
    })
  return {
    run(time: number) {
      const next = callbacks.entries().next().value as
        [number, FrameRequestCallback] | undefined
      if (!next) throw new Error(`No animation frame scheduled at ${time}ms`)
      callbacks.delete(next[0])
      next[1](time)
    },
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}

function linearChild(domain: readonly [number, number]) {
  return defineChart({
    marks: [
      dot([{ id: 'point', x: domain[0], y: 1 }], {
        id: 'point',
        x: 'x',
        y: 'y',
        key: 'id',
      }),
    ],
    x: { scale: scaleLinear().domain(domain) },
    y: { scale: scaleLinear().domain([0, 2]) },
    guides: false,
    margin: 0,
  })
}

function controlledLegendChild() {
  const legend: ChartColorLegend = {
    height: () => 20,
    render: () => ({
      kind: 'group',
      key: 'controlled-legend',
      children: [],
    }),
    control: () => ({
      key: 'legend-control',
      extension: { id: 'test-control', create: () => ({}) },
    }),
  }
  return defineChart({
    marks: [
      dot([{ id: 'point', x: 1, y: 1, series: 'only' }], {
        id: 'point',
        x: 'x',
        y: 'y',
        color: 'series',
      }),
    ],
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 2]) },
    color: { legend },
  })
}

const unsafeCompose = composeViews as unknown as (
  options: object,
) => StaticChartDefinition

function forgedLink(value: unknown): ViewScaleLink {
  return value as ViewScaleLink
}

function directViewGroups(nodes: readonly SceneNode[]): SceneGroup[] {
  const root = flatten(nodes).find(
    (node): node is SceneGroup =>
      node.kind === 'group' && node.className === 'ts-chart__views',
  )
  return (
    root?.children.filter(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.className === 'ts-chart__view',
    ) ?? []
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
