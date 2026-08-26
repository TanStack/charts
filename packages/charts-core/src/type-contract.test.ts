import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, scaleLinear, scaleTime, scaleUtc } from 'd3-scale'
import type {
  CrosshairAxisOptions as PublicCrosshairAxisOptions,
  CrosshairBandOptions as PublicCrosshairBandOptions,
  CrosshairLabelOptions as PublicCrosshairLabelOptions,
  CrosshairMarkerOptions as PublicCrosshairMarkerOptions,
  CrosshairOptions as PublicCrosshairOptions,
  CrosshairRuleOptions as PublicCrosshairRuleOptions,
} from '@tanstack/charts/types'
import { barX, barY } from './bar'
import type { BarYOptions } from './bar'
import { mountChart } from './dom'
import { dot } from './dot'
import { facet } from './facet'
import { focusGroupX } from './focus'
import { brushX, type BrushRange } from './interaction-brush'
import {
  continuousCursor,
  type ContinuousCursorChange,
  type ContinuousCursorPosition,
} from './interaction-cursor'
import {
  handleX,
  type HandleXChange,
  type HandleXOptions,
} from './interaction-handle'
import { controlledSignal } from './interaction-signal'
import { zoomX, type ZoomXChange, type ZoomXWindow } from './interaction-zoom'
import { lineY } from './line'
import { createMark } from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { cell, rect } from './rect'
import type { RectOptions } from './rect'
import { ruleX, ruleY } from './rule'
import { createChartRuntime } from './runtime'
import { createChartScene, defineChart } from './scene'
import { tooltip } from './tooltip'
import { portal } from './tooltip-portal'
import type {
  ChartControl,
  ChartAxisOptions,
  ChartColorLegend,
  ChartDefinition,
  ChartAxisViewportOptions,
  ChartFocusStrategy,
  ChartMark,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkScaleX,
  ChartMarkScaleY,
  ChartMarkX,
  ChartMarkY,
  ChartScale,
  ChartSpec,
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
  ChartSvgRenderer,
  ChartTooltipExtensionToken,
  ChartValue,
  ResolvedScaleViewport,
} from './types'

interface Row {
  id: string
  category: string
  value: number
  date: Date
  enabled: boolean
}

type PublicCrosshairTypeSurface = {
  axis: PublicCrosshairAxisOptions<string>
  band: PublicCrosshairBandOptions
  label: PublicCrosshairLabelOptions<string>
  marker: PublicCrosshairMarkerOptions
  options: PublicCrosshairOptions<string, number>
  rule: PublicCrosshairRuleOptions
}

const rows: readonly Row[] = [
  {
    id: 'a',
    category: 'Alpha',
    value: 4,
    date: new Date('2025-01-01T00:00:00Z'),
    enabled: true,
  },
]

interface LiteralRow {
  category: 'Alpha'
  value: 4
}

const dateBrushSignal = controlledSignal<BrushRange<Date>>(
  { start: rows[0]!.date, end: rows[0]!.date },
  () => {},
)
const dateBrush = brushX({
  range: dateBrushSignal,
  values: rows.map((row) => row.date),
})
const dateNumberCursor = continuousCursor({
  position: controlledSignal<
    ContinuousCursorPosition<Date, number> | null,
    ContinuousCursorChange<Date, number>
  >(null, () => {}),
  xLabel: {
    format: (value) => {
      expectTypeOf(value).toEqualTypeOf<Date>()
      return value.toISOString()
    },
  },
  yLabel: {
    format: (value) => {
      expectTypeOf(value).toEqualTypeOf<number>()
      return value.toLocaleString()
    },
  },
})
const dateDateCursor = continuousCursor({
  position: controlledSignal<
    ContinuousCursorPosition<Date, Date> | null,
    ContinuousCursorChange<Date, Date>
  >(null, () => {}),
})
const dateHandleSignal = controlledSignal<Date, HandleXChange<Date>>(
  rows[0]!.date,
  () => {},
)
const dateNumberHandleOptions: HandleXOptions<Date, number> = {
  value: dateHandleSignal,
  values: rows.map((row) => row.date),
  cross: { value: 2 },
  format: (value) => {
    expectTypeOf(value).toEqualTypeOf<Date>()
    return value.toISOString()
  },
}
const dateNumberHandle = handleX(dateNumberHandleOptions)
const dateStringHandle = handleX({
  value: dateHandleSignal,
  values: rows.map((row) => row.date),
  cross: { value: 'Alpha' as const },
})
// @ts-expect-error Horizontal handles require explicit ordered values.
handleX({ value: dateHandleSignal, cross: { edge: 'bottom' } })
const dateZoom = zoomX({
  window: controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
    { start: rows[0]!.date, end: new Date('2025-01-02T00:00:00Z') },
    () => {},
  ),
  extent: [rows[0]!.date, new Date('2025-01-03T00:00:00Z')],
  format: (value) => {
    expectTypeOf(value).toEqualTypeOf<Date>()
    return value.toISOString()
  },
})
const numberZoom = zoomX({
  window: controlledSignal<ZoomXWindow<number>, ZoomXChange<number>>(
    { start: 0, end: 4 },
    () => {},
  ),
  extent: [0, 4],
})
brushX({ range: dateBrushSignal, keyboard: false })
// @ts-expect-error String brushes require explicit ordered values.
brushX({
  range: controlledSignal<BrushRange<string>>(
    { start: 'a', end: 'b' },
    () => {},
  ),
  keyboard: false,
})
// @ts-expect-error Continuous brushes without explicit values cannot step by keyboard.
brushX({ range: dateBrushSignal, keyboard: true })

const literalRows: readonly LiteralRow[] = [{ category: 'Alpha', value: 4 }]

const categoricalMark = barY(rows, {
  x: 'category',
  y: 'value',
  key: 'id',
})
const optionalOptions: BarYOptions<Row> | undefined =
  rows.length > 0 ? { x: 'category', y: 'value' } : undefined
const optionalOptionsMark = barY(rows, optionalOptions)
const numericMark = dot(rows, { x: 'value', y: 'value' })
const temporalMark = lineY(rows, { x: 'date', y: 'value' })
const implicitIndexMark = lineY([3, 5, 8])
const literalMark = barY(literalRows, { x: 'category', y: 'value' })

const categoricalSpec: ChartSpec<readonly [typeof categoricalMark]> = {
  marks: [categoricalMark],
  x: {
    scale: scaleBand<string>().domain(['Alpha']),
    axis: {
      ticks: {
        format: (value) => {
          expectTypeOf(value).toEqualTypeOf<string>()
          return value
        },
      },
    },
  },
  y: {
    scale: scaleLinear().domain([0, 4]),
    axis: {
      ticks: {
        format: (value) => {
          expectTypeOf(value).toEqualTypeOf<number>()
          return value.toLocaleString()
        },
      },
    },
  },
}
const staticDefinition = defineChart({
  marks: [categoricalMark],
  x: {
    scale: scaleBand<string>().domain(['Alpha']),
    axis: {
      ticks: {
        format: (value) => {
          expectTypeOf(value).toEqualTypeOf<string>()
          return value
        },
      },
    },
  },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const numericDefinition = defineChart({
  marks: [numericMark],
  x: {
    scale: scaleLinear().domain([0, 4]),
    axis: {
      ticks: {
        format: (value) => {
          expectTypeOf(value).toEqualTypeOf<number>()
          return value.toLocaleString()
        },
      },
    },
  },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const temporalDefinition = defineChart({
  marks: [temporalMark],
  x: {
    scale: scaleUtc().domain(rows.map((row) => row.date)),
    axis: {
      ticks: {
        format: (value) => {
          expectTypeOf(value).toEqualTypeOf<Date>()
          return value.toISOString()
        },
      },
    },
  },
  y: { scale: scaleLinear().domain([0, 4]) },
})

defineChart(temporalDefinition, { controls: [dateBrush] })
// @ts-expect-error The brush x-value must match the chart x-value.
defineChart(numericDefinition, { controls: [dateBrush] })
defineChart(temporalDefinition, { controls: [dateNumberCursor] })
// @ts-expect-error The cursor x-value must match the chart x-value.
defineChart(numericDefinition, { controls: [dateNumberCursor] })
// @ts-expect-error The cursor y-value must match the chart y-value.
defineChart(temporalDefinition, { controls: [dateDateCursor] })
defineChart(temporalDefinition, { controls: [dateNumberHandle] })
// @ts-expect-error The handle x-value must match the chart x-value.
defineChart(numericDefinition, { controls: [dateNumberHandle] })
// @ts-expect-error A semantic handle cross must match the chart y-value.
defineChart(temporalDefinition, { controls: [dateStringHandle] })
defineChart(temporalDefinition, { controls: [dateZoom] })
defineChart(numericDefinition, { controls: [numberZoom] })
// @ts-expect-error The zoom x-value must match the chart x-value.
defineChart(numericDefinition, { controls: [dateZoom] })
const unionPositionMark = rows.length > 0 ? temporalMark : categoricalMark
const unionPositionDefinition = defineChart({
  marks: [unionPositionMark],
  x: { scale: scaleTime().domain(rows.map((row) => row.date)) },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const implicitIndexDefinition = defineChart({
  marks: [implicitIndexMark],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 8]) },
})
const literalDefinition = defineChart({
  marks: [literalMark],
  x: { scale: scaleBand<string>().domain(['Alpha']) },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const responsiveDefinition = defineChart(() => ({
  ...categoricalSpec,
  marks: [categoricalMark] as const,
}))
const widenedDefinition: ChartDefinition<Row, string, number> =
  rows.length > 0 ? staticDefinition : responsiveDefinition
const nativeTooltipToken: ChartTooltipExtensionToken<'react-native'> = {
  id: 'native-tooltip',
  __chartExtensionType: 'tooltip',
  __chartTooltipHost: 'react-native',
  create: () => undefined,
}
const nativeTooltipDefinition = defineChart(staticDefinition, {
  tooltip: nativeTooltipToken,
})

interface LineRow {
  kind: 'line'
  id: string
  date: Date
  value: number
}

interface BarRow {
  kind: 'bar'
  id: string
  category: string
  value: number
}

type DynamicInput =
  | { kind: 'line'; rows: readonly LineRow[] }
  | { kind: 'bar'; rows: readonly BarRow[] }

const createHeterogeneousDefinition = (input: DynamicInput) =>
  defineChart(() =>
    input.kind === 'line'
      ? {
          marks: [lineY(input.rows, { x: 'date', y: 'value', key: 'id' })],
          x: { scale: scaleUtc().domain(input.rows.map((row) => row.date)) },
          y: { scale: scaleLinear().domain([0, 10]) },
        }
      : {
          marks: [barX(input.rows, { x: 'value', y: 'category', key: 'id' })],
          x: { scale: scaleLinear().domain([0, 10]) },
          y: {
            scale: scaleBand<string>().domain(
              input.rows.map((row) => row.category),
            ),
          },
        },
  )
const heterogeneousDefinition = createHeterogeneousDefinition({
  kind: 'line',
  rows: [],
})

const categoricalRect = rect([{ x1: 'Alpha', x2: 'Beta', y1: 0, y2: 1 }], {
  x1: 'x1',
  x2: 'x2',
  y1: 'y1',
  y2: 'y2',
})
const categoricalCell = cell([{ x: 'Alpha', y: 1 }], {
  x: 'x',
  y: 'y',
})
const optionalEndpointRows: readonly {
  x1?: string
  x2?: string
  y1?: number
  y2?: number
}[] = [{ x1: 'Alpha', x2: 'Beta', y1: 0 }]
const widenedRectOptions: RectOptions<{
  x1?: string
  x2?: string
  y1?: number
  y2?: number
}> = {
  x1: 'x1',
  x2: 'x2',
  y1: 'y1',
  y2: 'y2',
}
const widenedRect = rect(optionalEndpointRows, widenedRectOptions)
const optionalEndpointRect = rect(optionalEndpointRows, {
  x1: 'x1',
  x2: 'x2',
  y1: 'y1',
  y2: 'y2',
})
const categoricalRectDefinition = defineChart({
  marks: [categoricalRect],
  x: { scale: scaleBand<string>().domain(['Alpha', 'Beta']) },
  y: { scale: scaleLinear().domain([0, 1]) },
})
const facetedMark = facet(rows, {
  by: 'category',
  chart: (data, { key }) => {
    expectTypeOf(data).toEqualTypeOf<readonly [Row, ...Row[]]>()
    expectTypeOf(key).toEqualTypeOf<string | number>()
    return categoricalSpec
  },
})
const customMark = createMark<Row>(() => ({
  id: 'custom',
  channels: {},
  render: () => ({ nodes: [] }),
}))
const positionlessMark = createMarkWithScaleValues<
  Row,
  number,
  number,
  never,
  never
>(() => ({
  id: 'positionless',
  channels: {},
  render: () => ({ nodes: [] }),
}))
const positionlessDefinition = defineChart({
  marks: [positionlessMark],
})
const verticalRuleDefinition = defineChart({
  marks: [ruleY([1, 2])],
  y: { scale: scaleLinear() },
})
const horizontalRuleDefinition = defineChart({
  marks: [ruleX([1, 2])],
  x: { scale: scaleLinear() },
})
const endpointCustomMark = createMarkWithScaleValues<
  Row,
  number,
  number,
  string,
  number
>(() => ({
  id: 'custom-endpoint',
  channels: {
    x: { scale: 'x', values: rows.map((row) => row.category) },
    y: { scale: 'y', values: rows.map((row) => row.value) },
  },
  render: () => ({
    nodes: [],
    points: rows.map((row, datumIndex) => ({
      key: row.id,
      markId: 'custom-endpoint',
      group: null,
      groupLabel: 'custom-endpoint',
      datum: row,
      datumIndex,
      xValue: datumIndex,
      yValue: row.value,
      x: datumIndex,
      y: row.value,
      color: 'currentColor',
    })),
  }),
}))
const endpointCustomDefinition = defineChart({
  marks: [endpointCustomMark],
  x: { scale: scaleBand<string>().domain(rows.map((row) => row.category)) },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const customScale: ChartScale = {
  id: 'custom',
  resolve: () => ({
    id: 'custom',
    type: 'custom',
    domain: [],
    map: () => 0,
    ticks: [],
    bandwidth: 0,
  }),
}

if (false) {
  const numericViewport: ChartAxisViewportOptions<number> = {
    domain: [0, 10],
  }
  const temporalViewport: ChartAxisViewportOptions<Date> = {
    domain: [new Date(0), new Date(10)],
  }
  const mixedViewport: ChartAxisViewportOptions = {
    // @ts-expect-error A viewport tuple cannot mix numeric and temporal values.
    domain: [0, new Date(10)],
  }
  const categoricalAxis: ChartAxisOptions<string> = {
    scale: scaleBand<string>(),
    // @ts-expect-error Categorical axes cannot configure a continuous viewport.
    viewport: { domain: ['Alpha', 'Beta'] },
  }
  const unionTemporalAxis: ChartAxisOptions<string | Date> = {
    scale: scaleUtc(),
    viewport: { domain: [new Date(0), new Date(10)] },
  }
  const mixedResolvedViewport: ResolvedScaleViewport = {
    contentDomain: [0, 10],
    // @ts-expect-error A resolved viewport also requires a homogeneous domain.
    domain: [0, new Date(10)],
    translate: 0,
    map: () => 0,
  }
  void numericViewport
  void temporalViewport
  void mixedViewport
  void categoricalAxis
  void unionTemporalAxis
  void mixedResolvedViewport

  expectTypeOf(positionlessDefinition).toMatchTypeOf<
    ChartDefinition<Row, number, number>
  >()
  expectTypeOf(verticalRuleDefinition).toMatchTypeOf<
    ChartDefinition<never, never, never>
  >()
  expectTypeOf(horizontalRuleDefinition).toMatchTypeOf<
    ChartDefinition<never, never, never>
  >()
  // @ts-expect-error Cartesian marks still require explicit x and y scales.
  defineChart({ marks: [numericMark] })
  // @ts-expect-error A mixed chart still requires axes used by its Cartesian mark.
  defineChart({ marks: [positionlessMark, numericMark] })
  // @ts-expect-error Positionless marks do not accept a phantom x scale.
  defineChart({
    marks: [positionlessMark],
    x: { scale: scaleLinear() },
  })
  const container = document.createElement('div')
  const temporalBehavior: ChartControl<Date, number> = {
    id: 'temporal-behavior',
    resolve: () => ({}),
  }
  defineChart(temporalDefinition, { controls: [temporalBehavior] })
  // @ts-expect-error A Date-x behavior cannot consume a numeric-x chart.
  defineChart(numericDefinition, { controls: [temporalBehavior] })
  const customLegend: ChartColorLegend = {
    height(itemCount, context) {
      expectTypeOf(itemCount).toEqualTypeOf<number>()
      expectTypeOf(context.width).toEqualTypeOf<number>()
      expectTypeOf(context.colors.domain).toEqualTypeOf<
        readonly (string | number)[]
      >()
      expectTypeOf(context.chart.width).toEqualTypeOf<number>()
      return itemCount
    },
    render(context) {
      expectTypeOf(context.theme.foreground).toEqualTypeOf<string>()
      return { kind: 'group', key: 'legend', children: [] }
    },
  }
  void customLegend
  const categoricalFocus: ChartFocusStrategy<Row, string, number> = {
    resolve(points, context) {
      expectTypeOf(context.x).toEqualTypeOf<number>()
      expectTypeOf(context.y).toEqualTypeOf<number>()
      expectTypeOf(context.maxDistance).toEqualTypeOf<number>()
      return points.filter(
        (point) =>
          point.datum.enabled &&
          point.xValue.startsWith('A') &&
          point.yValue > 0,
      )
    },
    group(points, { point }) {
      return points.filter(
        (candidate) =>
          candidate.datum.category === point.datum.category &&
          candidate.xValue === point.xValue,
      )
    },
    navigation(points) {
      return [...points].sort(
        (left, right) => left.datum.value - right.datum.value,
      )
    },
  }
  const numericFocus: ChartFocusStrategy<Row, number, number> = {
    resolve: (points) => points,
    group: (_points, { point }) => [point],
    navigation: (points) => points,
  }
  const numericRenderer: ChartSvgRenderer<Row, number, number> = () => ''
  const interactiveCategoricalDefinition = defineChart(staticDefinition, {
    focus: categoricalFocus,
    tooltip: {
      use: tooltip,
      portal,
      items: [
        {
          channel: 'x',
          label: 'Category',
          text(point) {
            expectTypeOf(point.datum).toEqualTypeOf<Row>()
            expectTypeOf(point.xValue).toEqualTypeOf<string>()
            return point.xValue
          },
        },
        {
          field: 'value',
          text(point) {
            expectTypeOf(point.datum.value).toEqualTypeOf<number>()
            expectTypeOf(point.xValue).toEqualTypeOf<string>()
            return point.datum.value.toLocaleString()
          },
        },
        {
          id: 'status',
          text(point, context) {
            expectTypeOf(point.datum).toEqualTypeOf<Row>()
            expectTypeOf(context.formatY).toBeFunction()
            expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
            return point.datum.enabled ? 'enabled' : null
          },
        },
      ],
      sort(left, right) {
        expectTypeOf(left.datum).toEqualTypeOf<Row>()
        expectTypeOf(right.xValue).toEqualTypeOf<string>()
        return left.yValue - right.yValue
      },
      anchor(points, context) {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: Row
          xValue: string
          yValue: number
        }>()
        expectTypeOf(context.pointer?.x).toEqualTypeOf<number | undefined>()
        expectTypeOf(context.plot.width).toEqualTypeOf<number>()
        expectTypeOf(context.focus.primary.datum).toEqualTypeOf<Row>()
        expectTypeOf(context.scales.x?.map).toBeFunction()
        return context.pointer ?? { x: context.plot.x, y: context.plot.y }
      },
      placement: ['top', 'bottom-right'],
      offset: 12,
      format(point, context) {
        expectTypeOf(point.datum).toEqualTypeOf<Row>()
        expectTypeOf(point.xValue).toEqualTypeOf<string>()
        expectTypeOf(point.yValue).toEqualTypeOf<number>()
        expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
        expectTypeOf(context.xLabel).toEqualTypeOf<string>()
        expectTypeOf(context.formatX).toBeFunction()
        return point.xValue
      },
      formatGroup(points, context) {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: Row
          xValue: string
          yValue: number
        }>()
        expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
        expectTypeOf(context.yLabel).toEqualTypeOf<string>()
        expectTypeOf(context.formatY).toBeFunction()
        return points.map((point) => point.xValue).join(', ')
      },
      content(points, context) {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: Row
          xValue: string
          yValue: number
        }>()
        expectTypeOf(context.xLabel).toEqualTypeOf<string>()
        expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
        return {
          rows: points.map((point) => ({
            label: point.datum.category,
            value: context.formatY(point.yValue),
          })),
        }
      },
    },
    spatialIndex(points, { scene }) {
      expectTypeOf(points).items.toMatchTypeOf<{
        datum: Row
        xValue: string
        yValue: number
      }>()
      expectTypeOf(scene.points).toEqualTypeOf<typeof points>()
      return {
        findNearest: () => points[0] ?? null,
      }
    },
  })
  const categoricalHost = mountChart(container, {
    definition: interactiveCategoricalDefinition,
    ariaLabel: 'Categorical values',
    onFocusChange(point) {
      if (!point) return
      expectTypeOf(point.datum).toEqualTypeOf<Row>()
      expectTypeOf(point.xValue).toEqualTypeOf<string>()
      expectTypeOf(point.yValue).toEqualTypeOf<number>()
    },
    onFocusGroupChange(points) {
      expectTypeOf(points).items.toMatchTypeOf<{
        datum: Row
        xValue: string
        yValue: number
      }>()
    },
    onSelect(point) {
      if (!point) return
      expectTypeOf(point.xValue).toEqualTypeOf<string>()
      expectTypeOf(point.yValue).toEqualTypeOf<number>()
    },
    onRender({ scene }) {
      expectTypeOf(scene.points).items.toMatchTypeOf<{
        datum: Row
        xValue: string
        yValue: number
      }>()
    },
    renderSvg(scene) {
      expectTypeOf(scene.points).items.toMatchTypeOf<{
        datum: Row
        xValue: string
        yValue: number
      }>()
      return ''
    },
  })
  expectTypeOf(categoricalHost.getScene().points).items.toMatchTypeOf<{
    datum: Row
    xValue: string
    yValue: number
  }>()
  mountChart(container, {
    definition: defineChart(staticDefinition, { focus: focusGroupX }),
    ariaLabel: 'Built-in focus remains polymorphic',
  })
  if (false) {
    mountChart(container, {
      // @ts-expect-error DOM hosts reject React Native tooltip tokens.
      definition: nativeTooltipDefinition,
      ariaLabel: 'Native tooltip definition',
    })
  }
  mountChart(container, {
    definition: defineChart(staticDefinition, { focus: 'group-x' }),
    ariaLabel: 'Built-in focus preset',
  })
  // @ts-expect-error Boolean datum fields require a derived text item.
  defineChart(staticDefinition, {
    tooltip: {
      use: tooltip,
      items: [
        {
          field: 'enabled',
        },
      ],
    },
  })
  // @ts-expect-error Configured tooltip options require an extension token.
  defineChart(staticDefinition, { tooltip: { sticky: false } })
  // @ts-expect-error Portal tokens cannot enable the tooltip extension.
  defineChart(staticDefinition, { tooltip: portal })
  // @ts-expect-error Portaling requires the explicit portal extension.
  defineChart(staticDefinition, {
    tooltip: {
      use: tooltip,
      portal: true,
    },
  })
  // @ts-expect-error Tooltip tokens cannot configure portal transport.
  defineChart(staticDefinition, {
    tooltip: {
      use: tooltip,
      portal: tooltip,
    },
  })
  mountChart(container, {
    definition: staticDefinition,
    ariaLabel: 'Definition-only tooltip configuration',
    // @ts-expect-error Chart controls belong to the definition, not the host.
    tooltip,
  })
  mountChart<Row, string, number>(container, {
    // @ts-expect-error A numeric-x focus strategy cannot consume string-x points.
    definition: defineChart(staticDefinition, {
      focus: numericFocus,
    }),
    ariaLabel: 'Incompatible focus coordinates',
  })
  mountChart<Row, string, number>(container, {
    definition: staticDefinition,
    ariaLabel: 'Incompatible renderer coordinates',
    // @ts-expect-error A numeric-x renderer cannot consume a string-x scene.
    renderSvg: numericRenderer,
  })

  const numericScene = createChartScene(numericDefinition, {
    width: 640,
    height: 320,
  })
  expectTypeOf(numericScene.points).items.toMatchTypeOf<{
    datum: Row
    xValue: number
    yValue: number
  }>()

  const staticRuntime = createChartRuntime<Row>()
  const categoricalRuntimeScene = staticRuntime.render(staticDefinition, {
    width: 640,
    height: 320,
  })
  expectTypeOf(categoricalRuntimeScene.points).items.toMatchTypeOf<{
    datum: Row
    xValue: string
    yValue: number
  }>()
  const temporalRuntimeScene = staticRuntime.render(temporalDefinition, {
    width: 640,
    height: 320,
  })
  expectTypeOf(temporalRuntimeScene.points).items.toMatchTypeOf<{
    datum: Row
    xValue: Date
    yValue: number
  }>()

  const temporalHost = mountChart(container, {
    definition: temporalDefinition,
    ariaLabel: 'Temporal values',
    onFocusChange(point) {
      if (!point) return
      expectTypeOf(point.xValue).toEqualTypeOf<Date>()
      expectTypeOf(point.yValue).toEqualTypeOf<number>()
    },
  })
  expectTypeOf(temporalHost.getScene().points).items.toMatchTypeOf<{
    datum: Row
    xValue: Date
    yValue: number
  }>()

  const heterogeneousHost = mountChart(container, {
    definition: defineChart(heterogeneousDefinition, { focus: focusGroupX }),
    ariaLabel: 'Heterogeneous values',
    onFocusChange(point) {
      if (!point) return
      expectTypeOf(point.datum).toEqualTypeOf<LineRow | BarRow>()
      expectTypeOf(point.xValue).toEqualTypeOf<Date | number>()
      expectTypeOf(point.yValue).toEqualTypeOf<number | string>()
    },
    onFocusGroupChange(points) {
      expectTypeOf(points).items.toMatchTypeOf<{
        datum: LineRow | BarRow
        xValue: Date | number
        yValue: number | string
      }>()
    },
    onSelect(point) {
      if (!point) return
      expectTypeOf(point.xValue).toEqualTypeOf<Date | number>()
      expectTypeOf(point.yValue).toEqualTypeOf<number | string>()
    },
  })
  heterogeneousHost.update({
    definition: createHeterogeneousDefinition({ kind: 'bar', rows: [] }),
    ariaLabel: 'Updated heterogeneous values',
  })
  const dynamicRuntime = createChartRuntime<LineRow | BarRow>()
  const heterogeneousRuntimeScene = dynamicRuntime.render(
    heterogeneousDefinition,
    { width: 640, height: 320 },
  )
  expectTypeOf(heterogeneousRuntimeScene.points).items.toMatchTypeOf<{
    datum: LineRow | BarRow
    xValue: Date | number
    yValue: number | string
  }>()

  const responsiveHost = mountChart(container, {
    definition: responsiveDefinition,
    ariaLabel: 'Responsive definition',
    onFocusChange(point) {
      expectTypeOf(point?.datum).toEqualTypeOf<Row | undefined>()
    },
  })
  responsiveHost.update({
    definition: responsiveDefinition,
    ariaLabel: 'Responsive definition update',
  })

  mountChart(container, {
    // @ts-expect-error DOM hosts require a definition refined to the DOM tooltip host.
    definition: widenedDefinition,
    ariaLabel: 'Widened definition',
  })

  // @ts-expect-error A boolean field cannot feed a numeric channel.
  lineY(rows, { x: 'date', y: 'enabled' })

  // @ts-expect-error Field-name channels must exist on the datum.
  barY(rows, { x: 'missing', y: 'value' })

  const invalidCategoricalSpec: ChartSpec<readonly [typeof categoricalMark]> = {
    marks: [categoricalMark],
    // @ts-expect-error The x channel emits strings, so a numeric scale is invalid.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }
  void invalidCategoricalSpec

  const invalidNumericSpec: ChartSpec<readonly [typeof numericMark]> = {
    marks: [numericMark],
    // @ts-expect-error Numeric x values cannot use a categorical scale.
    x: { scale: scaleBand<string>().domain(['Alpha']) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }
  void invalidNumericSpec

  const invalidTemporalSpec: ChartSpec<readonly [typeof temporalMark]> = {
    marks: [temporalMark],
    // @ts-expect-error Date x values cannot use a numeric scale.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }
  void invalidTemporalSpec

  const invalidUnionPositionSpec: ChartSpec<
    readonly [typeof unionPositionMark]
  > = {
    marks: [unionPositionMark],
    // @ts-expect-error The string | Date axis has no numeric scale branch.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }
  void invalidUnionPositionSpec

  // @ts-expect-error Static definitions infer and enforce the mark-to-scale contract.
  defineChart({
    marks: [categoricalMark],
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  })

  // @ts-expect-error Responsive definitions retain the mark-to-scale contract.
  defineChart(() => ({
    marks: [barY(rows, { x: 'category', y: 'value' })],
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }))

  // @ts-expect-error Rect endpoint channels participate in the inferred scale contract.
  defineChart({
    marks: [categoricalRect],
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 1]) },
  })

  const validRectSpec: ChartSpec<readonly [typeof categoricalRect]> = {
    marks: [categoricalRect],
    x: { scale: scaleBand<string>().domain(['Alpha', 'Beta']) },
    y: { scale: scaleLinear().domain([0, 1]) },
  }
  const validCellSpec: ChartSpec<readonly [typeof categoricalCell]> = {
    marks: [categoricalCell],
    x: { scale: scaleBand<string>().domain(['Alpha']) },
    y: { scale: scaleLinear().domain([0, 1]) },
  }
  const invalidRectSpec: ChartSpec<readonly [typeof categoricalRect]> = {
    marks: [categoricalRect],
    // @ts-expect-error Rect endpoint channels emit strings, so a numeric scale is invalid.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 1]) },
  }
  const invalidCellSpec: ChartSpec<readonly [typeof categoricalCell]> = {
    marks: [categoricalCell],
    x: { scale: scaleBand<string>().domain(['Alpha']) },
    // @ts-expect-error Cell y channels emit numbers, so a categorical scale is invalid.
    y: { scale: scaleBand<string>().domain(['row']) },
  }
  const uncheckedFacetSpec: ChartSpec<readonly [typeof facetedMark]> = {
    marks: [facetedMark],
  }
  const uncheckedCustomMarkSpec: ChartSpec<readonly [typeof customMark]> = {
    marks: [customMark],
    x: { scale: scaleBand<string>() },
    y: { scale: scaleUtc() },
  }
  const invalidEndpointCustomSpec: ChartSpec<
    readonly [typeof endpointCustomMark]
  > = {
    marks: [endpointCustomMark],
    // @ts-expect-error A custom mark's declared string scale values reject a linear scale.
    x: { scale: scaleLinear() },
    y: { scale: scaleLinear() },
  }
  const uncheckedScaleSpec: ChartSpec<readonly [typeof categoricalMark]> = {
    marks: [categoricalMark],
    x: { scale: customScale },
    y: { scale: scaleLinear() },
  }
  void [
    validRectSpec,
    validCellSpec,
    invalidRectSpec,
    invalidCellSpec,
    uncheckedFacetSpec,
    uncheckedCustomMarkSpec,
    invalidEndpointCustomSpec,
    uncheckedScaleSpec,
  ]
}

describe('public type contracts', () => {
  it('exports crosshair options from the type-only entry', () => {
    expectTypeOf<PublicCrosshairTypeSurface['axis']>().toMatchTypeOf<{
      band?: boolean | PublicCrosshairTypeSurface['band']
      label?: boolean | PublicCrosshairTypeSurface['label']
    }>()
    expectTypeOf<PublicCrosshairTypeSurface['options']>().toMatchTypeOf<{
      marker?: boolean | PublicCrosshairTypeSurface['marker']
      stroke?: PublicCrosshairTypeSurface['rule']['stroke']
    }>()
  })

  it('types inline state callbacks from one context object', () => {
    dot(rows, {
      x: 'value',
      y: 'value',
      states: [
        {
          when: ({ datum, index, data, point, focus, pointer, matches }) => {
            expectTypeOf(datum).toEqualTypeOf<Row>()
            expectTypeOf(index).toEqualTypeOf<number>()
            expectTypeOf(data).toEqualTypeOf<readonly Row[]>()
            expectTypeOf(point.datum).toEqualTypeOf<Row>()
            expectTypeOf(focus.primary.datum).toEqualTypeOf<Row>()
            expectTypeOf(pointer).toEqualTypeOf<{
              x: number
              y: number
            } | null>()
            expectTypeOf(matches).toBeFunction()
            return matches('primary')
          },
          style: {
            fill: ({ datum }) => (datum.enabled ? '#2563eb' : '#94a3b8'),
            r: ({ index }) => index + 4,
          },
        },
      ],
    })
  })

  it('preserves precise datum unions through heterogeneous definitions', () => {
    type InferredDatum = NonNullable<typeof heterogeneousDefinition.__datum>

    expectTypeOf<InferredDatum>().toEqualTypeOf<LineRow | BarRow>()
    expectTypeOf<
      ChartMarkPointX<typeof optionalOptionsMark>
    >().toEqualTypeOf<ChartValue>()
    expectTypeOf<
      ChartMarkPointY<typeof optionalOptionsMark>
    >().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof categoricalMark>>().toEqualTypeOf<string>()
    expectTypeOf<ChartMarkY<typeof categoricalMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof numericMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkY<typeof numericMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof temporalMark>>().toEqualTypeOf<Date>()
    expectTypeOf<ChartMarkY<typeof temporalMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof implicitIndexMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkY<typeof implicitIndexMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof literalMark>>().toEqualTypeOf<string>()
    expectTypeOf<ChartMarkY<typeof literalMark>>().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkScaleX<typeof categoricalRect>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      ChartMarkScaleY<typeof categoricalRect>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkPointX<typeof categoricalRect>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkPointY<typeof categoricalRect>
    >().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkX<typeof categoricalRect>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkY<typeof categoricalRect>>().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof categoricalRectDefinition.__xValue>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof categoricalRectDefinition.__yValue>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkScaleX<typeof categoricalCell>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      ChartMarkScaleY<typeof categoricalCell>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkPointX<typeof categoricalCell>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      ChartMarkPointY<typeof categoricalCell>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartMarkScaleX<typeof widenedRect>
    >().toEqualTypeOf<ChartValue>()
    expectTypeOf<
      ChartMarkScaleY<typeof widenedRect>
    >().toEqualTypeOf<ChartValue>()
    expectTypeOf<
      ChartMarkScaleX<typeof optionalEndpointRect>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      ChartMarkScaleY<typeof optionalEndpointRect>
    >().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkScaleX<typeof facetedMark>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkY<typeof customMark>>().toEqualTypeOf<ChartValue>()
    expectTypeOf<
      ChartMarkScaleX<typeof endpointCustomMark>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      ChartMarkPointX<typeof endpointCustomMark>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof endpointCustomDefinition.__xValue>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartSpecDatum<typeof endpointCustomDefinition>
    >().toEqualTypeOf<Row>()
    expectTypeOf<
      ChartSpecXValue<typeof endpointCustomDefinition>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      ChartSpecYValue<typeof endpointCustomDefinition>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof numericDefinition.__datum>
    >().toEqualTypeOf<Row>()
    expectTypeOf<
      NonNullable<typeof temporalDefinition.__datum>
    >().toEqualTypeOf<Row>()
    expectTypeOf<
      NonNullable<typeof implicitIndexDefinition.__datum>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof literalDefinition.__datum>
    >().toEqualTypeOf<LiteralRow>()
    expectTypeOf<
      NonNullable<typeof staticDefinition.__xValue>
    >().toEqualTypeOf<string>()
    expectTypeOf<
      NonNullable<typeof staticDefinition.__yValue>
    >().toEqualTypeOf<number>()
    expectTypeOf<
      NonNullable<typeof temporalDefinition.__xValue>
    >().toEqualTypeOf<Date>()
    expectTypeOf<
      NonNullable<typeof unionPositionDefinition.__xValue>
    >().toEqualTypeOf<string | Date>()
    expectTypeOf<
      NonNullable<typeof heterogeneousDefinition.__xValue>
    >().toEqualTypeOf<Date | number>()
    expectTypeOf<
      NonNullable<typeof heterogeneousDefinition.__yValue>
    >().toEqualTypeOf<number | string>()
    expect(categoricalSpec.marks).toEqual([categoricalMark])
  })
})
