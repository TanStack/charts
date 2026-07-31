import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleBand, scaleLinear, scaleOrdinal, scaleRadial } from 'd3-scale'
import { curveMonotoneX, curveStep } from 'd3-shape'
import { areaY } from './area'
import { areaX } from './area-x'
import { barX, barY } from './bar'
import { d3Curve } from './d3-shape'
import { dot } from './dot'
import { group } from './group'
import { colorLegend } from './legend'
import { lineY } from './line'
import { cell } from './rect'
import { ruleX, ruleY } from './rule'
import { createChartScene, defineChart } from './scene'
import { stack } from './stack'
import { renderChartSvg } from './svg'
import { renderChartSvgWithResources } from './svg-resources'
import { text } from './text'
import {
  bandAxes,
  bandXAxes,
  bandYAxes,
  linearAxes,
  utcXAxes,
} from './test-scales'
import type { ChartDefinition, SceneNode } from './types'

describe('core marks and categorical scales', () => {
  it('uses supplied band and linear scales for vertical bars', () => {
    const data = [
      { id: 'a', category: 'Alpha', value: 12 },
      { id: 'b', category: 'Beta', value: -4 },
    ]
    const definition = defineChart({
      marks: [
        barY(data, {
          x: 'category',
          y: 'value',
          key: 'id',
          radius: 3,
        }),
      ],
      ...bandXAxes(['Alpha', 'Beta'], [-4, 12]),
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })
    const rectangles = flatten(scene.nodes).filter(
      (node) => node.kind === 'rect',
    )

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<(typeof data)[number]>
    >()
    expect(scene.scales.x.type).toBe('band')
    expect(scene.scales.x.domain).toEqual(['Alpha', 'Beta'])
    expect(scene.scales.x.bandwidth).toBeGreaterThan(0)
    expect(scene.scales.y.domain[0]).toBeLessThanOrEqual(0)
    expect(rectangles).toHaveLength(2)
    expect(scene.points.map((point) => point.datum)).toEqual(data)
  })

  it('supports horizontal bars with a categorical y scale', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          barX(
            [
              { package: 'router', downloads: 24 },
              { package: 'query', downloads: 31 },
            ],
            { x: 'downloads', y: 'package' },
          ),
        ],
        ...bandYAxes([0, 31], ['router', 'query']),
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.type).toBe('configured')
    expect(scene.scales.y.type).toBe('band')
    expect(scene.scales.y.map('router')).toBeLessThan(
      scene.scales.y.map('query'),
    )
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'rect'),
    ).toHaveLength(2)
  })

  it('infers bar identity from the unique categorical channel', () => {
    const first = [
      { package: 'router', downloads: 24 },
      { package: 'query', downloads: 31 },
    ]
    const next = [
      { package: 'query', downloads: 35 },
      { package: 'router', downloads: 28 },
    ]
    const createScene = (rows: typeof first) =>
      createChartScene(
        defineChart({
          marks: [barX(rows, { x: 'downloads', y: 'package' })],
          ...bandYAxes(
            [0, 40],
            rows.map((row) => row.package),
          ),
        }),
        { width: 480, height: 260 },
      )
    const initialKeys = new Map(
      createScene(first).points.map((point) => [
        point.datum.package,
        point.key,
      ]),
    )

    expect(
      createScene(next).points.map((point) => [point.datum.package, point.key]),
    ).toEqual([
      ['query', initialKeys.get('query')],
      ['router', initialKeys.get('router')],
    ])
  })

  it('infers dot and text identity from stable positional candidates', () => {
    const firstDots = [
      { name: 'Page A', count: 10 },
      { name: 'Page B', count: 20 },
    ]
    const nextDots = [
      { name: 'Page B', count: 24 },
      { name: 'Page A', count: 12 },
    ]
    const dotKeys = (rows: typeof firstDots) =>
      new Map(
        createChartScene(
          defineChart({
            marks: [dot(rows, { x: 'name', y: 'count' })],
            ...bandXAxes(
              rows.map((row) => row.name),
              [0, 30],
            ),
          }),
          { width: 480, height: 260 },
        ).points.map((point) => [point.datum.name, point.key]),
      )
    const initialDotKeys = dotKeys(firstDots)

    expect(dotKeys(nextDots)).toEqual(initialDotKeys)

    const firstLabels = [
      { label: 'A', x: 1, y: 1 },
      { label: 'B', x: 1, y: 2 },
      { label: 'C', x: 2, y: 1 },
    ]
    const nextLabels = [
      { label: 'C', x: 2, y: 1 },
      { label: 'A', x: 1, y: 1 },
      { label: 'B', x: 1, y: 2 },
    ]
    const textKeys = (rows: typeof firstLabels) =>
      new Map(
        createChartScene(
          defineChart({
            marks: [text(rows, { x: 'x', y: 'y', text: 'label' })],
            ...linearAxes([0, 3], [0, 3]),
          }),
          { width: 480, height: 260 },
        ).points.map((point) => [point.datum.label, point.key]),
      )

    expect(textKeys(nextLabels)).toEqual(textKeys(firstLabels))
  })

  it('falls back to position when an inferred channel is not unique', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const rows = [
      { category: 'Same', value: 4 },
      { category: 'Same', value: 8 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value' })],
        ...bandXAxes(['Same'], [0, 8]),
      }),
      { width: 480, height: 260 },
    )

    expect(scene.points.map((point) => point.key)).toEqual([
      expect.stringContaining('number:0'),
      expect.stringContaining('number:1'),
    ])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('encodes bar color independently from layout grouping', () => {
    const data = [
      { id: 'a', category: 'Alpha', value: 12 },
      { id: 'b', category: 'Beta', value: 18 },
    ]
    const colors = () =>
      scaleOrdinal<string, string>()
        .domain(['Alpha', 'Beta'])
        .range(['red', 'blue'])
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            color: 'category',
            key: 'id',
          }),
        ],
        ...bandXAxes(['Alpha', 'Beta'], [0, 18]),
        color: { scale: colors() },
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX(data, {
            x: 'value',
            y: 'category',
            color: 'category',
            key: 'id',
          }),
        ],
        ...bandYAxes([0, 18], ['Alpha', 'Beta']),
        color: { scale: colors() },
      }),
      { width: 480, height: 260 },
    )
    const verticalBars = flatten(vertical.nodes).filter(
      (node) => node.kind === 'rect',
    )
    const horizontalBars = flatten(horizontal.nodes).filter(
      (node) => node.kind === 'rect',
    )

    expect(vertical.colors.domain).toEqual(['Alpha', 'Beta'])
    expect(vertical.points.map((point) => point.color)).toEqual(['red', 'blue'])
    expect(vertical.points.map((point) => point.group)).toEqual([null, null])
    expect(
      verticalBars.map((node) => (node.kind === 'rect' ? node.width : 0)),
    ).toEqual([
      expect.closeTo(vertical.scales.x.bandwidth),
      expect.closeTo(vertical.scales.x.bandwidth),
    ])
    expect(
      horizontalBars.map((node) => (node.kind === 'rect' ? node.height : 0)),
    ).toEqual([
      expect.closeTo(horizontal.scales.y.bandwidth),
      expect.closeTo(horizontal.scales.y.bandwidth),
    ])
    expect(verticalBars[0]).toMatchObject({
      kind: 'rect',
      x: vertical.scales.x.map('Alpha') - vertical.scales.x.bandwidth / 2,
    })
    expect(horizontalBars[0]).toMatchObject({
      kind: 'rect',
      y: horizontal.scales.y.map('Alpha') - horizontal.scales.y.bandwidth / 2,
    })
  })

  it('uses an injected D3 band scale for grouped bar geometry', () => {
    const data = [
      {
        id: 'a:query',
        category: 'A',
        series: 'Query',
        start: 0,
        end: 12,
      },
      {
        id: 'a:router',
        category: 'A',
        series: 'Router',
        start: 0,
        end: 8,
      },
    ]
    const groupScale = scaleBand<string>()
      .domain(['Query', 'Router'])
      .padding(0.2)
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y1: 'start',
            y2: 'end',
            z: 'series',
            layout: group({ scale: groupScale }),
            key: 'id',
          }),
        ],
        ...bandXAxes(['A'], [0, 12]),
      }),
      { width: 480, height: 260 },
    )
    const bars = flatten(scene.nodes).filter((node) => node.kind === 'rect')
    const resolvedGroupScale = groupScale
      .copy()
      .range([0, scene.scales.x.bandwidth])
    const categoryStart = scene.scales.x.map('A') - scene.scales.x.bandwidth / 2

    expect(bars).toHaveLength(2)
    expect(bars[0]).toMatchObject({
      kind: 'rect',
      x: categoryStart + (resolvedGroupScale('Query') ?? Number.NaN),
      width: resolvedGroupScale.bandwidth(),
    })
    expect(bars[1]).toMatchObject({
      kind: 'rect',
      x: categoryStart + (resolvedGroupScale('Router') ?? Number.NaN),
      width: resolvedGroupScale.bandwidth(),
    })
    expect(scene.points.map((point) => point.groupLabel)).toEqual([
      'Query',
      'Router',
    ])
    expect(groupScale.range()).toEqual([0, 1])
  })

  it('infers grouped-bar domains from a band-scale factory', () => {
    const data = [
      { id: 'a:query', category: 'A', series: 'Query', value: 12 },
      { id: 'a:router', category: 'A', series: 'Router', value: 8 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            z: 'series',
            layout: group({ scale: () => scaleBand<string>().padding(0.2) }),
            key: 'id',
          }),
        ],
        ...bandXAxes(['A'], [0, 12]),
      }),
      { width: 480, height: 260 },
    )
    const bars = flatten(scene.nodes).filter((node) => node.kind === 'rect')

    expect(bars).toHaveLength(2)
    expect(bars[0]?.kind === 'rect' ? bars[0].width : 0).toBeGreaterThan(0)
    expect(bars[1]?.kind === 'rect' ? bars[1].x : 0).toBeGreaterThan(
      bars[0]?.kind === 'rect' ? bars[0].x : 0,
    )
  })

  it('uses color as the subgroup channel when grouped layout is explicit and z is omitted', () => {
    const data = [
      { id: 'a:query', category: 'A', series: 'Query', value: 12 },
      { id: 'a:router', category: 'A', series: 'Router', value: 8 },
    ]
    const colors = () =>
      scaleOrdinal<string, string>()
        .domain(['Query', 'Router'])
        .range(['red', 'blue'])
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            color: 'series',
            layout: group({ scale: () => scaleBand<string>().padding(0.2) }),
          }),
        ],
        ...bandXAxes(['A'], [0, 12]),
        color: { scale: colors() },
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX(data, {
            x: 'value',
            y: 'category',
            color: 'series',
            layout: group({ scale: () => scaleBand<string>().padding(0.2) }),
          }),
        ],
        ...bandYAxes([0, 12], ['A']),
        color: { scale: colors() },
      }),
      { width: 480, height: 260 },
    )
    const verticalBars = flatten(vertical.nodes).filter(
      (node) => node.kind === 'rect',
    )
    const horizontalBars = flatten(horizontal.nodes).filter(
      (node) => node.kind === 'rect',
    )

    for (const scene of [vertical, horizontal]) {
      expect(scene.points.map((point) => point.group)).toEqual([
        'Query',
        'Router',
      ])
      expect(scene.points.map((point) => point.color)).toEqual(['red', 'blue'])
    }
    expect(
      verticalBars[1]?.kind === 'rect' ? verticalBars[1].x : 0,
    ).toBeGreaterThan(verticalBars[0]?.kind === 'rect' ? verticalBars[0].x : 0)
    expect(
      horizontalBars[1]?.kind === 'rect' ? horizontalBars[1].y : 0,
    ).toBeGreaterThan(
      horizontalBars[0]?.kind === 'rect' ? horizontalBars[0].y : 0,
    )
  })

  it('keeps explicit z authoritative over color for grouped bars', () => {
    const data = [
      {
        id: 'a:left',
        category: 'A',
        series: 'Left',
        status: 'Warm',
        value: 12,
      },
      {
        id: 'a:right',
        category: 'A',
        series: 'Right',
        status: 'Cool',
        value: 8,
      },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            z: 'series',
            color: 'status',
            layout: group({
              scale: scaleBand<string>().domain(['Left', 'Right']),
            }),
          }),
        ],
        ...bandXAxes(['A'], [0, 12]),
        color: {
          scale: scaleOrdinal<string, string>()
            .domain(['Warm', 'Cool'])
            .range(['red', 'blue']),
        },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.points.map((point) => point.group)).toEqual(['Left', 'Right'])
    expect(scene.points.map((point) => point.color)).toEqual(['red', 'blue'])
  })

  it('does not turn the z channel into implicit subgroup geometry', () => {
    const data = [
      { id: 'a', category: 'Alpha', series: 'A', value: 12 },
      { id: 'b', category: 'Beta', series: 'B', value: 18 },
    ]
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            z: 'series',
            key: 'id',
          }),
        ],
        ...bandXAxes(['Alpha', 'Beta'], [0, 18]),
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX(data, {
            x: 'value',
            y: 'category',
            z: 'series',
            key: 'id',
          }),
        ],
        ...bandYAxes([0, 18], ['Alpha', 'Beta']),
      }),
      { width: 480, height: 260 },
    )
    const verticalBars = flatten(vertical.nodes).filter(
      (node) => node.kind === 'rect',
    )
    const horizontalBars = flatten(horizontal.nodes).filter(
      (node) => node.kind === 'rect',
    )

    expect(verticalBars[0]).toMatchObject({
      kind: 'rect',
      width: vertical.scales.x.bandwidth,
      x: vertical.scales.x.map('Alpha') - vertical.scales.x.bandwidth / 2,
    })
    expect(horizontalBars[0]).toMatchObject({
      kind: 'rect',
      height: horizontal.scales.y.bandwidth,
      y: horizontal.scales.y.map('Alpha') - horizontal.scales.y.bandwidth / 2,
    })
  })

  it('renders explicit stacked intervals at full category bandwidth', () => {
    const stacked = [
      { id: 'a:query', category: 'A', series: 'Query', y1: 0, y2: 12 },
      { id: 'a:router', category: 'A', series: 'Router', y1: 12, y2: 20 },
    ]
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY(stacked, {
            x: 'category',
            y1: 'y1',
            y2: 'y2',
            z: 'series',
            key: 'id',
          }),
        ],
        ...bandXAxes(['A'], [0, 20]),
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX(stacked, {
            y: 'category',
            x1: 'y1',
            x2: 'y2',
            z: 'series',
            key: 'id',
          }),
        ],
        ...bandYAxes([0, 20], ['A']),
      }),
      { width: 480, height: 260 },
    )
    const verticalBars = flatten(vertical.nodes).filter(
      (node) => node.kind === 'rect',
    )
    const horizontalBars = flatten(horizontal.nodes).filter(
      (node) => node.kind === 'rect',
    )

    expect(verticalBars).toHaveLength(2)
    expect(verticalBars[0]).toMatchObject({
      kind: 'rect',
      x: verticalBars[1]?.kind === 'rect' ? verticalBars[1].x : undefined,
      width:
        verticalBars[1]?.kind === 'rect' ? verticalBars[1].width : undefined,
    })
    expect(horizontalBars).toHaveLength(2)
    expect(horizontalBars[0]).toMatchObject({
      kind: 'rect',
      y: horizontalBars[1]?.kind === 'rect' ? horizontalBars[1].y : undefined,
      height:
        horizontalBars[1]?.kind === 'rect'
          ? horizontalBars[1].height
          : undefined,
    })
    expect(vertical.scales.y.domain).toEqual([0, 20])
    expect(horizontal.scales.x.domain).toEqual([0, 20])
  })

  it('implicitly stacks bar lengths and preserves raw values with computed extents', () => {
    const rows = [
      { id: 'a:query', category: 'A', series: 'Query', value: 12 },
      { id: 'a:router', category: 'A', series: 'Router', value: 8 },
      { id: 'b:query', category: 'B', series: 'Query', value: -4 },
      { id: 'b:router', category: 'B', series: 'Router', value: 6 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(rows, {
            x: 'category',
            y: 'value',
            color: 'series',
            key: 'id',
          }),
        ],
        ...bandXAxes(['A', 'B'], [-4, 20]),
      }),
      { width: 480, height: 260 },
    )

    expect(
      scene.points.map(({ group, yValue, y1Value, y2Value }) => ({
        group,
        yValue,
        y1Value,
        y2Value,
      })),
    ).toEqual([
      { group: 'Query', yValue: 12, y1Value: 0, y2Value: 12 },
      { group: 'Router', yValue: 8, y1Value: 12, y2Value: 20 },
      { group: 'Query', yValue: -4, y1Value: -4, y2Value: 0 },
      { group: 'Router', yValue: 6, y1Value: 0, y2Value: 6 },
    ])
    expect(scene.scales.y.domain).toEqual([-4, 20])
  })

  it('configures implicit stacks through the stack layout', () => {
    const rows = [
      { category: 'A', series: 'Query', value: 1 },
      { category: 'A', series: 'Router', value: 3 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(rows, {
            x: 'category',
            y: 'value',
            z: 'series',
            layout: stack({ offset: 'normalize', order: 'descending' }),
          }),
        ],
        ...bandXAxes(['A'], [0, 1]),
      }),
      { width: 480, height: 260 },
    )

    expect(
      scene.points.map(({ yValue, y1Value, y2Value }) => ({
        yValue,
        y1Value,
        y2Value,
      })),
    ).toEqual([
      { yValue: 1, y1Value: 0.75, y2Value: 1 },
      { yValue: 3, y1Value: 0, y2Value: 0.75 },
    ])
  })

  it('shares implicit stack semantics with areaY', () => {
    const rows = [
      { date: 1, series: 'Query', value: 2 },
      { date: 2, series: 'Query', value: 3 },
      { date: 1, series: 'Router', value: 4 },
      { date: 2, series: 'Router', value: 5 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          areaY(rows, {
            x: 'date',
            y: 'value',
            z: 'series',
            color: 'series',
          }),
        ],
        ...linearAxes([1, 2], [0, 8]),
      }),
      { width: 480, height: 260 },
    )

    expect(
      scene.points.map(({ yValue, y1Value, y2Value }) => ({
        yValue,
        y1Value,
        y2Value,
      })),
    ).toEqual([
      { yValue: 2, y1Value: 0, y2Value: 2 },
      { yValue: 3, y1Value: 0, y2Value: 3 },
      { yValue: 4, y1Value: 2, y2Value: 6 },
      { yValue: 5, y1Value: 3, y2Value: 8 },
    ])
  })

  it('transposes implicit stack semantics for areaX', () => {
    const rows = [
      { position: 1, series: 'Query', value: 2 },
      { position: 2, series: 'Query', value: 3 },
      { position: 1, series: 'Router', value: 4 },
      { position: 2, series: 'Router', value: 5 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          areaX(rows, {
            x: 'value',
            y: 'position',
            color: 'series',
          }),
        ],
        ...linearAxes([0, 8], [1, 2]),
      }),
      { width: 480, height: 260 },
    )

    expect(
      scene.points.map(({ xValue, x1Value, x2Value }) => ({
        xValue,
        x1Value,
        x2Value,
      })),
    ).toEqual([
      { xValue: 2, x1Value: 0, x2Value: 2 },
      { xValue: 3, x1Value: 0, x2Value: 3 },
      { xValue: 4, x1Value: 2, x2Value: 6 },
      { xValue: 5, x1Value: 3, x2Value: 8 },
    ])
  })

  it('rejects a stack layout combined with authored endpoints', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            areaY([{ x: 1, start: 0, end: 2 }], {
              x: 'x',
              y1: 'start',
              y2: 'end',
              layout: stack(),
            }),
          ],
          ...linearAxes([0, 2], [0, 2]),
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/explicit y1 or y2 endpoints/)
  })

  it('rejects continuous color as inferred stack identity', () => {
    const rows = [
      { category: 'A', value: 1, intensity: 0.2 },
      { category: 'A', value: 2, intensity: 0.8 },
    ]
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            barY(rows, {
              x: 'category',
              y: 'value',
              color: 'intensity',
            }),
          ],
          ...bandXAxes(['A'], [0, 3]),
          color: {
            scale: () => scaleLinear<string>().range(['white', 'black']),
          },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/continuous color channel cannot infer series identity/)
  })

  it('renders interval areas, visual accessors, gradients, and dashed lines', () => {
    const data = [
      {
        id: 'query:1',
        series: 'Query',
        date: new Date('2026-01-01'),
        y1: 0,
        y2: 10,
        gradient: 'query-gradient',
      },
      {
        id: 'query:2',
        series: 'Query',
        date: new Date('2026-01-02'),
        y1: 0,
        y2: 14,
        gradient: 'query-gradient',
      },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          areaY(data, {
            x: 'date',
            y1: 'y1',
            y2: 'y2',
            z: 'series',
            key: 'id',
            fill: (datum) => `url(#${datum.gradient})`,
          }),
          lineY(data, {
            x: 'date',
            y: 'y2',
            z: 'series',
            key: 'id',
            stroke: () => '#2563eb',
            strokeDasharray: '2 4',
          }),
        ],
        ...utcXAxes([new Date('2026-01-01'), new Date('2026-01-02')], [0, 14]),
        gradients: [
          {
            id: 'query-gradient',
            stops: [
              { offset: 0, color: '#2563eb', opacity: 1 },
              { offset: 1, color: '#2563eb', opacity: 0.2 },
            ],
          },
        ],
        clip: true,
      }),
      { width: 480, height: 260 },
    )
    const svg = renderChartSvgWithResources(scene, {
      ariaLabel: 'Stacked downloads',
    })
    const scopedSvg = renderChartSvgWithResources(scene, {
      ariaLabel: 'Scoped stacked downloads',
      idPrefix: 'chart:one',
    })

    expect(scene.points.at(-1)?.yValue).toBe(14)
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('fill="url(#query-gradient)"')
    expect(svg).toContain('stroke-dasharray="2 4"')
    expect(svg).toContain('<clipPath')
    expect(svg).toContain('clip-path="url(#')
    expect(scopedSvg).toContain('id="chartone-query-gradient"')
    expect(scopedSvg).toContain('fill="url(#chartone-query-gradient)"')
    expect(scopedSvg).toMatch(/clip-path="url\(#chartone-ts-chart-clip-/)
  })

  it('composes area, dots, rules, and text in one scene', () => {
    const data = [
      { id: 'a', x: 0, y: 4, label: 'A' },
      { id: 'b', x: 1, y: 8, label: 'B' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          areaY(data, {
            x: 'x',
            y: 'y',
            key: 'id',
            curve: d3Curve(curveMonotoneX),
          }),
          dot(data, {
            x: 'x',
            y: 'y',
            key: 'id',
            stroke: 'black',
            strokeOpacity: 0.28,
          }),
          ruleY([0], { strokeDasharray: '4 2' }),
          ruleX([1], { strokeDasharray: '2 3' }),
          text(data, {
            x: 'x',
            y: 'y',
            text: 'label',
            z: 'label',
            key: 'id',
            dx: 6,
            dy: -4,
          }),
        ],
        color: {
          scale: scaleOrdinal<string, string>()
            .domain(['A', 'B'])
            .range(['red', 'blue']),
        },
        ...linearAxes([0, 1], [0, 8]),
      }),
      { width: 480, height: 260 },
    )
    const nodes = flatten(scene.nodes)
    const svg = renderChartSvg(scene, { ariaLabel: 'Composite chart' })

    expect(nodes.some((node) => node.kind === 'area')).toBe(true)
    const baseDots = nodes.filter(
      (node) => node.kind === 'dot' && !node.key.startsWith('default-focus:'),
    )
    expect(baseDots).toHaveLength(2)
    expect(baseDots).toMatchObject([
      { style: { stroke: 'black', strokeOpacity: 0.28 } },
      { style: { stroke: 'black', strokeOpacity: 0.28 } },
    ])
    expect(
      nodes.find(
        (node) => node.kind === 'rule' && node.key.startsWith('rule-y-'),
      ),
    ).toMatchObject({ style: { strokeDasharray: '4 2' } })
    expect(
      nodes.find(
        (node) => node.kind === 'rule' && node.key.startsWith('rule-x-'),
      ),
    ).toMatchObject({ style: { strokeDasharray: '2 3' } })
    expect(
      nodes.filter((node) => node.kind === 'label').length,
    ).toBeGreaterThan(2)
    expect(svg).toContain('data-ts-key=')
    expect(svg).toContain('stroke-dasharray="4 2"')
    expect(svg).toContain('Z"')
    expect(svg).toMatch(/d="M[^"]+L[^"]+Z"/)
    expect(scene.points.slice(-2).map((point) => point.color)).toEqual([
      'red',
      'blue',
    ])
    const labels = nodes.filter(
      (node) =>
        node.kind === 'label' && (node.text === 'A' || node.text === 'B'),
    )
    expect(labels).toMatchObject([
      {
        kind: 'label',
        x: scene.scales.x.map(0) + 6,
        y: scene.scales.y.map(4) - 4,
        style: { fill: 'red' },
      },
      {
        kind: 'label',
        x: scene.scales.x.map(1) + 6,
        y: scene.scales.y.map(8) - 4,
        style: { fill: 'blue' },
      },
    ])
  })

  it('renders categorical cells and shares one color domain across marks', () => {
    const data = [
      { id: 'a', column: 'Mon', row: 'AM', status: 'healthy' },
      { id: 'b', column: 'Tue', row: 'PM', status: 'warning' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          cell(data, {
            x: 'column',
            y: 'row',
            z: 'status',
            key: 'id',
            radius: 3,
          }),
          dot(data, {
            x: 'column',
            y: 'row',
            z: 'status',
            key: 'id',
            r: 2,
          }),
        ],
        color: {
          domain: ['healthy', 'warning'],
          range: ['green', 'orange'],
          legend: colorLegend({ label: 'Status' }),
        },
        ...bandAxes(['Mon', 'Tue'], ['AM', 'PM']),
      }),
      { width: 480, height: 260 },
    )
    const cells = flatten(scene.nodes).filter((node) => node.kind === 'rect')

    expect(cells).toHaveLength(2)
    expect(scene.colors.domain).toEqual(['healthy', 'warning'])
    expect(scene.colors.map('healthy')).toBe('green')
    expect(
      flatten(scene.nodes).filter((node) => node.key.startsWith('legend-dot:')),
    ).toHaveLength(2)
  })

  it('renders D3 step and monotone line curves', () => {
    const data = [1, 4, 2, 6]
    const monotone = renderChartSvg(
      createChartScene(
        defineChart({
          marks: [lineY(data, { curve: d3Curve(curveMonotoneX) })],
          ...linearAxes([0, 3], [0, 6]),
        }),
        { width: 480, height: 260 },
      ),
      { ariaLabel: 'Monotone line' },
    )
    const step = renderChartSvg(
      createChartScene(
        defineChart({
          marks: [lineY(data, { curve: d3Curve(curveStep) })],
          ...linearAxes([0, 3], [0, 6]),
        }),
        {
          width: 480,
          height: 260,
        },
      ),
      { ariaLabel: 'Step line' },
    )

    expect(monotone).toMatch(/d="M[^"]+C/)
    expect(step).toMatch(/d="M[^"]+L[^"]+L[^"]+L/)
  })

  it('accepts a D3 radius scale and otherwise uses raw pixel radii', () => {
    const data = [
      { id: 'a', x: 0, y: 0, size: 0 },
      { id: 'b', x: 1, y: 1, size: 100 },
    ]
    const scaled = createChartScene(
      defineChart({
        marks: [
          dot(data, {
            x: 'x',
            y: 'y',
            r: 'size',
            rScale: scaleRadial().domain([0, 100]).range([0, 14]),
            key: 'id',
          }),
        ],
        ...linearAxes([0, 1], [0, 1]),
      }),
      { width: 480, height: 260 },
    )
    const raw = createChartScene(
      defineChart({
        marks: [
          dot(data.slice(1), {
            x: 'x',
            y: 'y',
            r: 'size',
          }),
        ],
        ...linearAxes([0, 1], [0, 1]),
      }),
      { width: 480, height: 260 },
    )
    const scaledDots = flatten(scaled.nodes).filter(
      (node) => node.kind === 'dot',
    )
    const rawDot = flatten(raw.nodes).find((node) => node.kind === 'dot')

    expect(scaledDots[0]).toMatchObject({ kind: 'dot', radius: 0 })
    expect(scaledDots[1]).toMatchObject({ kind: 'dot', radius: 14 })
    expect(rawDot).toMatchObject({ kind: 'dot', radius: 100 })
  })

  it('infers radius domains from a scale factory', () => {
    const data = [
      { id: 'a', x: 0, y: 0, size: 0 },
      { id: 'b', x: 1, y: 1, size: 100 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(data, {
            x: 'x',
            y: 'y',
            r: 'size',
            rScale: {
              scale: () => scaleRadial().range([0, 14]),
            },
            key: 'id',
          }),
        ],
        ...linearAxes([0, 1], [0, 1]),
      }),
      { width: 480, height: 260 },
    )
    const dots = flatten(scene.nodes).filter((node) => node.kind === 'dot')

    expect(dots[0]).toMatchObject({ kind: 'dot', radius: 0 })
    expect(dots[1]).toMatchObject({ kind: 'dot', radius: 14 })
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
