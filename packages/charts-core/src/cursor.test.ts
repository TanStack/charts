import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
import { facetChart } from './facet'
import { focusNearestX, focusNearestY, focusX, focusY } from './focus'
import {
  createChartCursor,
  createFocusChartCursorState,
  createFreeChartCursorState,
  resolveChartCursorFocus,
  resolveChartCursorPresentation,
  resolveChartFocusStrategy,
  resolveChartPointerFocus,
  sameChartValue,
} from './cursor'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import type {
  ChartCursorBinding,
  ChartCursorState,
  ChartDefinition,
  ChartFocusMode,
  ChartPoint,
  ChartScene,
} from './types'

interface NumericRow {
  id: string
  x: number
  y: number
}

const numericRows: readonly NumericRow[] = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 10, y: 10 },
]

function numericScene(width = 320, height = 180) {
  return createChartScene(
    defineChart({
      marks: [lineY(numericRows, { x: 'x', y: 'y', key: 'id' })],
      x: { scale: scaleLinear().domain([0, 10]) },
      y: { scale: scaleLinear().domain([0, 10]) },
      guides: false,
    }),
    { width, height },
  )
}

describe('chart cursor controller', () => {
  it('composes containment with every built-in axis focus mode', () => {
    const xScene = axisContainmentScene('x')
    const yScene = axisContainmentScene('y')
    const cases: readonly {
      mode: ChartFocusMode<NumericRow, number, number>
      scene: ChartScene<NumericRow, number, number>
      x: number
      y: number
      grouped: boolean
    }[] = [
      { mode: 'nearest-x', scene: xScene, x: 50, y: 80, grouped: false },
      { mode: focusNearestX, scene: xScene, x: 50, y: 80, grouped: false },
      { mode: 'group-x', scene: xScene, x: 50, y: 80, grouped: true },
      { mode: focusX, scene: xScene, x: 50, y: 80, grouped: true },
      { mode: 'nearest-y', scene: yScene, x: 80, y: 50, grouped: false },
      { mode: focusNearestY, scene: yScene, x: 80, y: 50, grouped: false },
      { mode: 'group-y', scene: yScene, x: 80, y: 50, grouped: true },
      { mode: focusY, scene: yScene, x: 80, y: 50, grouped: true },
    ]

    for (const testCase of cases) {
      const focused = resolveChartPointerFocus(
        testCase.scene,
        testCase.mode,
        testCase.x,
        testCase.y,
        0,
      )
      expect(focused?.[0]?.datum.id).toBe('target')
      expect(focused).toHaveLength(testCase.grouped ? 2 : 1)
    }

    expect(
      resolveChartPointerFocus(xScene, 'group-x', 52, 160, 3)?.[0]?.datum.id,
    ).toBe('first')
    expect(resolveChartPointerFocus(xScene, 'group-x', 54, 160, 3)).toEqual([])
    expect(
      resolveChartPointerFocus(xScene, 'nearest', 50, 80, 0),
    ).toBeUndefined()
    expect(resolveChartPointerFocus(xScene, false, 50, 80, 0)).toBeUndefined()
    expect(resolveChartFocusStrategy(false)).toBeUndefined()
    expect(
      resolveChartPointerFocus(
        xScene,
        'group-x',
        50,
        80,
        1,
        xScene.points.slice(),
      )?.[0]?.datum.id,
    ).toBe('first')
  })

  it('publishes synchronous external-store updates and supports functional updates', () => {
    const controller = createChartCursor<number, number>()
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = controller.subscribe(first)
    controller.subscribe(second)
    const state: ChartCursorState<number, number> = {
      anchor: 'normalized',
      normalized: { x: 0.25, y: 0.75 },
      source: 'programmatic',
      pinned: false,
    }

    controller.setState(state)
    expect(controller.getState()).toBe(state)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()

    controller.setState(state)
    expect(first).toHaveBeenCalledOnce()

    controller.setState((previous) =>
      previous ? { ...previous, pinned: true } : previous,
    )
    expect(controller.getState()).toMatchObject({ pinned: true })
    expect(first).toHaveBeenCalledTimes(2)

    unsubscribeFirst()
    controller.setState(null)
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledTimes(3)
  })

  it('rejects missing and non-finite authoritative coordinates', () => {
    expect(() =>
      createChartCursor({
        anchor: 'scene',
        scene: {} as { x: number },
        source: 'programmatic',
        pinned: false,
      }),
    ).toThrow('at least one anchor coordinate')

    const controller = createChartCursor<number, number>()
    expect(() =>
      controller.setState({
        anchor: 'normalized',
        normalized: { y: Number.NaN },
        source: 'programmatic',
        pinned: false,
      }),
    ).toThrow('finite numbers')
    expect(controller.getState()).toBeNull()
  })
})

describe('chart cursor projection', () => {
  it('projects normalized, scene, and semantic anchors through each local scene', () => {
    const scene = numericScene()
    const xScale = scaleLinear().domain([0, 10])
    const yScale = scaleLinear().domain([0, 10])
    const xValueAt = vi.fn(
      ({
        scene,
        position,
      }: Parameters<
        NonNullable<
          NonNullable<
            Extract<
              ChartCursorBinding<NumericRow, number, number>,
              { mode: 'free' }
            >['x']
          >['valueAt']
        >
      >[0]) =>
        xScale
          .copy()
          .range([scene.chart.x, scene.chart.x + scene.chart.width])
          .invert(position),
    )
    const yValueAt = vi.fn(
      ({
        scene,
        position,
      }: Parameters<
        NonNullable<
          NonNullable<
            Extract<
              ChartCursorBinding<NumericRow, number, number>,
              { mode: 'free' }
            >['y']
          >['valueAt']
        >
      >[0]) =>
        yScale
          .copy()
          .range([scene.chart.y + scene.chart.height, scene.chart.y])
          .invert(position),
    )
    const binding = {
      mode: 'free',
      controller: createChartCursor<number, number>(),
      x: { valueAt: xValueAt },
      y: { valueAt: yValueAt },
    } satisfies ChartCursorBinding<NumericRow, number, number>
    const position = {
      x: scene.chart.x + scene.chart.width * 0.25,
      y: scene.chart.y + scene.chart.height * 0.75,
    }

    const state = createFreeChartCursorState(scene, binding, position)
    expect(state).toEqual({
      anchor: 'normalized',
      scene: position,
      normalized: { x: 0.25, y: 0.75 },
      value: { x: 2.5, y: 2.5 },
      source: 'pointer',
      pinned: false,
    })
    expect(xValueAt).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: 'x',
        scene,
        position: position.x,
        normalized: 0.25,
      }),
    )

    const presentation = resolveChartCursorPresentation(scene, binding, state)
    expect(presentation).toMatchObject({
      state,
      x: { position: position.x, normalized: 0.25, value: 2.5 },
      y: { position: position.y, normalized: 0.75, value: 2.5 },
    })

    const responsiveScene = numericScene(640, 300)
    const responsive = resolveChartCursorPresentation(
      responsiveScene,
      binding,
      state,
    )
    expect(responsive?.x?.position).toBeCloseTo(
      responsiveScene.chart.x + responsiveScene.chart.width * 0.25,
    )
    expect(responsive?.y?.position).toBeCloseTo(
      responsiveScene.chart.y + responsiveScene.chart.height * 0.75,
    )
    expect(state.scene).toBe(position)

    xValueAt.mockClear()
    yValueAt.mockClear()
    const semantic: ChartCursorState<number, number> = {
      anchor: 'value',
      value: { x: 7.5, y: 2.5 },
      source: 'programmatic',
      pinned: true,
    }
    const semanticPresentation = resolveChartCursorPresentation(
      responsiveScene,
      binding,
      semantic,
    )
    expect(semanticPresentation?.x?.position).toBeCloseTo(
      responsiveScene.scales.x!.map(7.5),
    )
    expect(semanticPresentation?.y?.position).toBeCloseTo(
      responsiveScene.scales.y!.map(2.5),
    )
    expect(xValueAt).not.toHaveBeenCalled()
    expect(yValueAt).not.toHaveBeenCalled()

    const sceneAnchored = resolveChartCursorPresentation(scene, binding, {
      anchor: 'scene',
      scene: { x: position.x },
      source: 'programmatic',
      pinned: false,
    })
    expect(sceneAnchored?.x).toMatchObject({
      position: position.x,
      normalized: 0.25,
      value: 2.5,
    })
    expect(sceneAnchored?.y).toBeUndefined()
  })

  it('omits a semantic axis when the destination scene has no matching scale', () => {
    const scene = { ...numericScene(), scales: {} }
    const binding = {
      mode: 'focus',
      match: 'x',
      controller: createChartCursor<number, number>(),
    } satisfies ChartCursorBinding<NumericRow, number, number>

    expect(
      resolveChartCursorPresentation(scene, binding, {
        anchor: 'value',
        value: { x: 5 },
        source: 'programmatic',
        pinned: false,
      }),
    ).toEqual({
      state: {
        anchor: 'value',
        value: { x: 5 },
        source: 'programmatic',
        pinned: false,
      },
      axes: 'x',
      x: undefined,
      y: undefined,
    })
  })

  it('respects a destination valueAt callback that rejects a coordinate', () => {
    const scene = numericScene()
    const binding = {
      mode: 'free',
      controller: createChartCursor<number, number>(),
      x: { valueAt: () => undefined },
    } satisfies ChartCursorBinding<NumericRow, number, number>

    expect(
      resolveChartCursorPresentation(scene, binding, {
        anchor: 'normalized',
        normalized: { x: 0.25 },
        value: { x: 7.5 },
        source: 'programmatic',
        pinned: false,
      })?.x,
    ).toMatchObject({ normalized: 0.25, value: undefined })
  })

  it('preserves the emitting facet when semantic values are not unique', () => {
    const rows = [
      { facet: 'A', x: 0, y: 1 },
      { facet: 'B', x: 0, y: 1 },
    ]
    const scene = createChartScene(
      facetChart(rows, {
        by: 'facet',
        columns: 2,
        axes: 'cell',
        chart: (data) => ({
          marks: [lineY(data, { x: 'x', y: 'y' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 2]) },
          guides: false,
          margin: 0,
        }),
      }),
      { width: 640, height: 240 },
    )
    const binding = {
      mode: 'focus',
      match: 'x',
      controller: createChartCursor(),
    } satisfies ChartCursorBinding<(typeof rows)[number]>
    const origin = scene.points.find((point) => point.datum.facet === 'B')!
    const state = createFocusChartCursorState(scene, binding, {
      primary: origin,
      group: [origin],
      source: 'pointer',
      pinned: false,
    })

    expect(resolveChartCursorPresentation(scene, binding, state)).toEqual({
      state,
      axes: 'x',
      x: undefined,
      y: undefined,
    })
    expect(resolveChartCursorFocus(scene.points, binding, state)[0]).toBe(
      origin,
    )
    expect(state.origin?.key).toContain('string:B')
  })
})

describe('focus cursor semantics', () => {
  interface TemporalRow {
    id: string
    series: string
    date: Date
    value: number
  }

  const instant = new Date('2026-01-02T00:00:00.000Z')
  const rows: readonly TemporalRow[] = [
    { id: 'a', series: 'A', date: instant, value: 2 },
    { id: 'b', series: 'B', date: new Date(instant), value: 8 },
    {
      id: 'c',
      series: 'A',
      date: new Date(instant.getTime() + 86_400_000),
      value: 4,
    },
  ]
  const scene = createChartScene(
    defineChart({
      marks: [
        lineY(rows, {
          x: 'date',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
      ],
      x: {
        scale: scaleUtc().domain([instant, rows[2]!.date]),
      },
      y: { scale: scaleLinear().domain([0, 10]) },
      guides: false,
    }),
    { width: 320, height: 180 },
  )
  const binding = {
    mode: 'focus',
    match: 'x',
    controller: createChartCursor<Date, number>(),
  } satisfies ChartCursorBinding<TemporalRow, Date, number>

  it('matches Date values exactly, prefers series, and reuses focus grouping', () => {
    const state: ChartCursorState<Date, number> = {
      anchor: 'value',
      value: { x: new Date(instant) },
      group: 'B',
      source: 'programmatic',
      pinned: false,
    }
    const points = resolveChartCursorFocus(
      scene.points,
      binding,
      state,
      resolveChartFocusStrategy('group-x'),
    )

    expect(points.map((point) => point.datum.id)).toEqual(['b', 'a'])
    expect(
      resolveChartCursorFocus(scene.points, binding, {
        ...state,
        value: { x: new Date(instant.getTime() + 1) },
      }),
    ).toEqual([])
    expect(sameChartValue(instant, new Date(instant))).toBe(true)
    expect(sameChartValue(instant, new Date(instant.getTime() + 1))).toBe(false)

    expect(
      resolveChartCursorFocus(
        scene.points,
        binding,
        {
          anchor: 'normalized',
          normalized: { x: 0.5 },
          value: { x: new Date(instant) },
          source: 'programmatic',
          pinned: false,
        },
        resolveChartFocusStrategy('group-x'),
      ),
    ).toEqual([])
  })

  it('publishes only the configured semantic focus axes', () => {
    const primary = scene.points[1]!
    const state = createFocusChartCursorState(scene, binding, {
      primary,
      group: [primary],
      source: 'keyboard',
      pinned: true,
    })

    expect(state).toEqual({
      anchor: 'value',
      value: { x: primary.xValue },
      scene: { x: primary.x },
      normalized: {
        x: (primary.x - scene.chart.x) / scene.chart.width,
      },
      group: primary.group,
      origin: {
        key: primary.key,
        markId: primary.markId,
        datumIndex: primary.datumIndex,
      },
      source: 'keyboard',
      pinned: true,
    })

    const presentation = resolveChartCursorPresentation(scene, binding, {
      ...state,
      value: { x: primary.xValue, y: primary.yValue },
    })
    expect(presentation?.x?.value).toEqual(primary.xValue)
    expect(presentation?.y).toBeUndefined()
  })

  it('keeps a stable keyed origin when equal-value rows reorder', () => {
    const keyedRows: readonly TemporalRow[] = [
      { id: 'a', series: 'A', date: instant, value: 2 },
      { id: 'b', series: 'A', date: instant, value: 4 },
      { id: 'c', series: 'A', date: instant, value: 6 },
    ]
    const render = (data: readonly TemporalRow[]) =>
      createChartScene(
        defineChart({
          marks: [
            lineY(data, {
              x: 'date',
              y: 'value',
              z: 'series',
              key: 'id',
            }),
          ],
          x: {
            scale: scaleUtc().domain([
              instant,
              new Date(instant.getTime() + 86_400_000),
            ]),
          },
          y: { scale: scaleLinear().domain([0, 10]) },
          guides: false,
        }),
        { width: 320, height: 180 },
      )
    const initial = render(keyedRows)
    const primary = initial.points.find((point) => point.datum.id === 'b')!
    const state = createFocusChartCursorState(initial, binding, {
      primary,
      group: [primary],
      source: 'pointer',
      pinned: true,
    })
    const reordered = render([keyedRows[2]!, keyedRows[0]!, keyedRows[1]!])

    expect(primary.datumIndex).toBe(1)
    expect(
      reordered.points.find((point) => point.datum.id === 'b')?.datumIndex,
    ).toBe(2)
    expect(
      resolveChartCursorFocus(reordered.points, binding, state)[0]?.datum.id,
    ).toBe('b')
  })

  it('ignores a foreign origin instead of matching its datum index', () => {
    const first = scene.points[0]!
    const second = scene.points[1]!

    expect(
      resolveChartCursorFocus(scene.points, binding, {
        anchor: 'value',
        value: { x: instant },
        origin: {
          key: 'foreign-key',
          markId: second.markId,
          datumIndex: second.datumIndex,
        },
        source: 'programmatic',
        pinned: false,
      })[0],
    ).toBe(first)
  })
})

function axisContainmentScene(axis: 'x' | 'y') {
  const base = numericScene()
  const first = axisPoint(
    'first',
    0,
    axis === 'x' ? 50 : 100,
    axis === 'x' ? 100 : 50,
    axis === 'x' ? 1 : 100,
    axis === 'x' ? 100 : 1,
  )
  const target = axisPoint(
    'target',
    1,
    axis === 'x' ? 50 : 60,
    axis === 'x' ? 60 : 50,
    axis === 'x' ? 1 : 60,
    axis === 'x' ? 60 : 1,
  )
  return {
    ...base,
    points: [first, target],
    nodes:
      axis === 'x'
        ? [
            sceneRectangle(first, 40, 100, 20, 40, 'x'),
            sceneRectangle(target, 40, 60, 20, 40, 'x'),
          ]
        : [
            sceneRectangle(first, 100, 40, 40, 20, 'y'),
            sceneRectangle(target, 60, 40, 40, 20, 'y'),
          ],
  } satisfies ChartScene<NumericRow, number, number>
}

function axisPoint(
  id: string,
  datumIndex: number,
  x: number,
  y: number,
  xValue: number,
  yValue: number,
): ChartPoint<NumericRow, number, number> {
  return {
    key: id,
    markId: 'axis-test',
    group: id,
    groupLabel: id,
    datum: { id, x: xValue, y: yValue },
    datumIndex,
    xValue,
    yValue,
    x,
    y,
    color: 'currentColor',
  }
}

function sceneRectangle(
  point: ChartPoint<NumericRow, number, number>,
  x: number,
  y: number,
  width: number,
  height: number,
  affinity: 'x' | 'y',
) {
  return {
    kind: 'rect' as const,
    key: point.key,
    x,
    y,
    width,
    height,
    interaction: { point, affinity },
  }
}

if (false) {
  interface CategoricalRow {
    category: string
    value: number
  }
  const rows: readonly CategoricalRow[] = [{ category: 'A', value: 1 }]
  const mark = lineY(rows, { x: 'category', y: 'value' })
  const controller = createChartCursor<string, number>()
  const definition = defineChart({
    marks: [mark],
    x: { scale: scaleBand<string>().domain(['A']) },
    y: { scale: scaleLinear().domain([0, 1]) },
    cursor: {
      mode: 'free',
      controller,
      x: {
        valueAt(context) {
          expectTypeOf(context.axis).toEqualTypeOf<'x' | 'y'>()
          expectTypeOf(context.scene.points).items.toMatchTypeOf<{
            datum: CategoricalRow
            xValue: string
            yValue: number
          }>()
          return context.scene.points[0]?.xValue
        },
      },
    },
  })
  expectTypeOf(definition).toMatchTypeOf<
    ChartDefinition<CategoricalRow, string, number>
  >()

  controller.setState({
    anchor: 'value',
    value: { x: 'A', y: 1 },
    source: 'programmatic',
    pinned: false,
  })
  // @ts-expect-error The shared x cursor must match the definition's string x axis.
  controller.setState({
    anchor: 'value',
    value: { x: 1 },
    source: 'programmatic',
    pinned: false,
  })

  const invalidBinding: ChartCursorBinding<CategoricalRow, string, number> = {
    mode: 'free',
    controller,
    x: {
      // @ts-expect-error The x inversion callback must return the x-axis value type.
      valueAt: () => 1,
    },
  }
  expectTypeOf(invalidBinding).toMatchTypeOf<
    ChartCursorBinding<CategoricalRow, string, number>
  >()
}
