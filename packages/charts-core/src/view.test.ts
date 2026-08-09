import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleLinear, scalePow } from 'd3-scale'
import { createChartCursor, cursorHost } from './cursor'
import { dot } from './dot'
import { rect } from './rect'
import { createChartScene, defineChart } from './scene'
import { viewGrid } from './view'
import type {
  ChartMotionContext,
  ChartSpecDatum,
  SceneGroup,
  SceneNode,
} from './types'

const unsafeViewGrid = viewGrid as unknown as (
  options: object,
) => import('./types').StaticChartDefinition

interface MainRow {
  id: string
  x: number
  y: number
}

interface XBin {
  id: string
  x: number
  x1: number
  x2: number
  count: number
  source: readonly MainRow[]
}

interface YBin {
  id: string
  y: number
  y1: number
  y2: number
  count: number
  source: readonly MainRow[]
}

describe('view grids', () => {
  it('aligns shared plots while retaining independent data and lineage', () => {
    const rows: readonly MainRow[] = [
      { id: 'a', x: 2, y: 4 },
      { id: 'b', x: 5, y: 5 },
      { id: 'c', x: 8, y: 7 },
    ]
    const xBins: readonly XBin[] = [
      { id: 'x0', x: 2, x1: 0, x2: 4, count: 2, source: rows.slice(0, 2) },
      { id: 'x1', x: 5, x1: 4, x2: 6, count: 7, source: rows.slice(1, 2) },
      { id: 'x2', x: 8, x1: 6, x2: 10, count: 3, source: rows.slice(2) },
    ]
    const yBins: readonly YBin[] = [
      { id: 'y0', y: 4, y1: 0, y2: 4.5, count: 9, source: rows.slice(0, 1) },
      { id: 'y1', y: 5, y1: 4, y2: 6, count: 2, source: rows.slice(1, 2) },
      { id: 'y2', y: 7, y1: 6, y2: 10, count: 4, source: rows.slice(2) },
    ]
    const definition = marginalGrid(rows, xBins, yBins)
    type Datum = ChartSpecDatum<typeof definition>
    expectTypeOf<Datum>().toEqualTypeOf<MainRow | XBin | YBin>()

    const scene = createChartScene(definition, { width: 720, height: 480 })
    const main = scene.points.find(
      (point) =>
        point.markId === 'marginals:main:main-dots' && point.datum === rows[1],
    )
    const top = scene.points.find(
      (point) =>
        point.markId === 'marginals:top:top-bars' && point.datum === xBins[1],
    )
    const right = scene.points.find(
      (point) =>
        point.markId === 'marginals:right:right-bars' &&
        point.datum === yBins[1],
    )
    expect(main).toBeDefined()
    expect(top).toBeDefined()
    expect(right).toBeDefined()
    expect(top?.x).toBeCloseTo(main?.x ?? 0, 6)
    expect(right?.y).toBeCloseTo(main?.y ?? 0, 6)
    expect(top?.yValue).toBe(7)
    expect(right?.xValue).toBe(2)
    expect(top && 'source' in top.datum ? top.datum.source[0] : undefined).toBe(
      rows[1],
    )
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(
      scene.points.length,
    )
    expect(new Set(scene.points.map((point) => point.markId))).toEqual(
      new Set([
        'marginals:main:main-dots',
        'marginals:top:top-bars',
        'marginals:right:right-bars',
      ]),
    )

    const nodes = flatten(scene.nodes)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__focus-layer--default'),
      ),
    ).toHaveLength(1)
    expect(
      nodes.filter(
        (node) => node.kind === 'group' && node.className === 'ts-chart__view',
      ),
    ).toHaveLength(3)
  })

  it('keeps responsive cells finite, disjoint, and structurally stable', () => {
    const rows: readonly MainRow[] = [{ id: 'a', x: 5, y: 5 }]
    const xBins: readonly XBin[] = [
      { id: 'x', x: 5, x1: 0, x2: 10, count: 1, source: rows },
    ]
    const yBins: readonly YBin[] = [
      { id: 'y', y: 5, y1: 0, y2: 10, count: 1, source: rows },
    ]
    const definition = marginalGrid(rows, xBins, yBins)
    const scenes = [320, 640, 960].map((width) =>
      createChartScene(definition, { width, height: 480 }),
    )
    const keys = scenes.map((scene) => scene.points.map((point) => point.key))
    expect(keys[1]).toEqual(keys[0])
    expect(keys[2]).toEqual(keys[0])

    scenes.forEach((scene) => {
      const cells = directViewGroups(scene.nodes)
      expect(cells).toHaveLength(3)
      cells.forEach((cell) => {
        expect(cell.clip?.width).toBeGreaterThan(0)
        expect(cell.clip?.height).toBeGreaterThan(0)
      })
      const main = cells.find((cell) => cell.key === 'marginals:main:view')!
      const top = cells.find((cell) => cell.key === 'marginals:top:view')!
      const right = cells.find((cell) => cell.key === 'marginals:right:view')!
      expect(top.translateX).toBe(main.translateX)
      expect(right.translateY).toBe(main.translateY)
      expect(
        (top.translateY ?? 0) + (top.clip?.height ?? 0),
      ).toBeLessThanOrEqual(main.translateY ?? 0)
      expect(
        (main.translateX ?? 0) + (main.clip?.width ?? 0),
      ).toBeLessThanOrEqual(right.translateX ?? 0)
    })
  })

  it('allows range alignment without shared domains', () => {
    const definition = viewGrid({
      rows: [
        { id: 'overview', size: 80 },
        { id: 'detail', grow: 1 },
      ],
      columns: [{ id: 'main', grow: 1 }],
      views: [
        {
          id: 'overview',
          row: 'overview',
          column: 'main',
          align: { x: 'detail' },
          chart: defineChart({
            marks: [dot([{ x: 50, y: 1 }], { x: 'x', y: 'y' })],
            x: { scale: scaleLinear().domain([0, 100]) },
            y: { scale: scaleLinear().domain([0, 2]) },
            guides: false,
          }),
        },
        {
          id: 'detail',
          row: 'detail',
          column: 'main',
          chart: defineChart({
            marks: [dot([{ x: 5, y: 1 }], { x: 'x', y: 'y' })],
            y: { scale: scaleLinear().domain([0, 2]) },
            x: {
              scale: scaleLinear().domain([0, 10]),
              axis: { label: 'A deliberately long detail-axis label' },
            },
          }),
        },
      ],
    })

    expect(() =>
      createChartScene(definition, { width: 520, height: 320 }),
    ).not.toThrow()
  })

  it('rejects mismatched shared domains, mappings, and placements', () => {
    const child = (domain: readonly [number, number], power = false) =>
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
        x: {
          scale: power
            ? scalePow().exponent(2).domain(domain)
            : scaleLinear().domain(domain),
        },
        y: { scale: scaleLinear().domain([0, 2]) },
        guides: false,
      })
    const compose = (
      top: ReturnType<typeof child>,
      bottom: ReturnType<typeof child>,
      bottomColumn = 'main' as 'main' | 'side',
    ) =>
      unsafeViewGrid({
        rows: [
          { id: 'top', size: 80 },
          { id: 'bottom', grow: 1 },
        ],
        columns: [
          { id: 'main', grow: 1 },
          { id: 'side', size: 80 },
        ],
        views: [
          {
            id: 'top',
            row: 'top',
            column: 'main',
            share: { x: 'bottom' },
            chart: top,
          },
          {
            id: 'bottom',
            row: 'bottom',
            column: bottomColumn,
            chart: bottom,
          },
        ],
      })

    expect(() =>
      createChartScene(compose(child([0, 10]), child([0, 20])), {
        width: 500,
        height: 300,
      }),
    ).toThrow(/resolved domains differ/)
    expect(() =>
      createChartScene(compose(child([0, 10]), child([0, 10], true)), {
        width: 500,
        height: 300,
      }),
    ).toThrow(/resolved mappings differ/)
    expect(() => compose(child([0, 10]), child([0, 10]), 'side')).toThrow(
      /same column track/,
    )
  })

  it('validates ids, cells, links, resources, and child ownership', () => {
    const chart = defineChart({
      marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 2]) },
    })
    const base = {
      rows: [{ id: 'main', grow: 1 }],
      columns: [{ id: 'main', grow: 1 }],
    } as const

    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          { id: 'a', row: 'main', column: 'main', chart },
          { id: 'b', row: 'main', column: 'main', chart },
        ],
      }),
    ).toThrow(/same grid cell/)
    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          {
            id: 'a',
            row: 'main',
            column: 'main',
            share: { x: 'missing' },
            chart,
          },
        ],
      }),
    ).toThrow(/unknown view/)
    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          {
            id: 'a',
            row: 'main',
            column: 'main',
            chart: { ...chart, tooltip: false },
          },
        ],
      }),
    ).toThrow(/host option "tooltip"/)
    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          {
            id: 'a',
            row: 'main',
            column: 'main',
            chart: { ...chart, pointer: false },
          },
        ],
      }),
    ).toThrow(/host option "pointer"/)
    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          {
            id: 'a',
            row: 'main',
            column: 'main',
            chart: {
              ...chart,
              cursor: {
                use: cursorHost,
                controller: createChartCursor<number, number>(),
                mode: 'focus',
              },
            },
          },
        ],
      }),
    ).toThrow(/host option "cursor"/)
    expect(() =>
      unsafeViewGrid({
        ...base,
        views: [
          {
            id: 'a',
            row: 'main',
            column: 'main',
            chart: {
              ...chart,
              gradients: [{ id: 'fade', stops: [{ offset: 0, color: 'red' }] }],
            },
          },
        ],
      }),
    ).toThrow(/cannot embed gradients/)

    expect(() =>
      viewGrid({
        id: 'grid',
        rows: [
          { id: 'first', size: 80 },
          { id: 'second', grow: 1 },
        ],
        columns: [{ id: 'main', grow: 1 }],
        views: [
          { id: 'child', row: 'first', column: 'main', chart },
          { id: 'grid:child', row: 'second', column: 'main', chart },
        ],
      }),
    ).toThrow(/same scene namespace/)

    expect(() =>
      viewGrid({
        rows: [
          { id: 'first', size: 80 },
          { id: 'second', grow: 1 },
        ],
        columns: [{ id: 'main', grow: 1 }],
        views: [
          {
            id: 'first',
            row: 'first',
            column: 'main',
            share: { x: 'second' },
            chart,
          },
          {
            id: 'second',
            row: 'second',
            column: 'main',
            share: { x: 'first' },
            chart,
          },
        ],
      }),
    ).toThrow(/cycle in x links/)
  })

  it('routes child mark motion through namespaced mark ids', () => {
    const timing = { delay: 37 } as const
    const definition = viewGrid({
      id: 'motion-grid',
      rows: [{ id: 'main', grow: 1 }],
      columns: [{ id: 'main', grow: 1 }],
      views: [
        {
          id: 'main',
          row: 'main',
          column: 'main',
          chart: defineChart({
            marks: [
              dot([{ x: 1, y: 1 }], {
                id: 'moving-dot',
                x: 'x',
                y: 'y',
                motion: timing,
              }),
            ],
            x: { scale: scaleLinear().domain([0, 2]) },
            y: { scale: scaleLinear().domain([0, 2]) },
          }),
        },
      ],
    })
    createChartScene(definition, { width: 300, height: 200 })
    const motion = definition.marks[0]?.motion
    expect(motion).toBeTypeOf('function')
    expect(
      typeof motion === 'function'
        ? motion(motionContext('motion-grid:main:moving-dot'))
        : undefined,
    ).toEqual(timing)
  })
})

function marginalGrid(
  rows: readonly MainRow[],
  xBins: readonly XBin[],
  yBins: readonly YBin[],
) {
  const xScale = scaleLinear().domain([0, 10])
  const yScale = scaleLinear().domain([0, 10])
  return viewGrid({
    id: 'marginals',
    rows: [
      { id: 'top', size: 88 },
      { id: 'main', grow: 1 },
    ],
    columns: [
      { id: 'main', grow: 1 },
      { id: 'right', size: 88 },
    ],
    gap: 10,
    views: [
      {
        id: 'main',
        row: 'main',
        column: 'main',
        chart: defineChart({
          marks: [dot(rows, { id: 'main-dots', x: 'x', y: 'y', key: 'id' })],
          x: {
            scale: xScale,
            axis: { label: 'A long horizontal measurement label' },
          },
          y: {
            scale: yScale,
            axis: { label: 'A long vertical measurement label' },
          },
        }),
      },
      {
        id: 'top',
        row: 'top',
        column: 'main',
        share: { x: 'main' },
        chart: defineChart({
          marks: [
            rect(xBins, {
              id: 'top-bars',
              x: 'x',
              x1: 'x1',
              x2: 'x2',
              y1: () => 0,
              y2: 'count',
              key: 'id',
            }),
          ],
          x: { scale: xScale },
          y: { scale: scaleLinear },
          guides: false,
        }),
      },
      {
        id: 'right',
        row: 'main',
        column: 'right',
        share: { y: 'main' },
        chart: defineChart({
          marks: [
            rect(yBins, {
              id: 'right-bars',
              x: 'count',
              x1: () => 0,
              x2: 'count',
              y: 'y',
              y1: 'y1',
              y2: 'y2',
              key: 'id',
            }),
          ],
          x: { scale: scaleLinear },
          y: { scale: yScale },
          guides: false,
        }),
      },
    ],
  })
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

function motionContext(markId: string): ChartMotionContext {
  return {
    phase: 'enter',
    role: 'dot',
    key: `${markId}:point`,
    markId,
    seriesKey: markId,
    seriesIndex: 0,
    datumIndex: 0,
    datumCount: 1,
    datum: undefined,
    point: undefined,
  }
}
