import { scaleBand } from 'd3-scale'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import { resolveScaleInput } from './scale-input'
import {
  markStatesMayUseCornerRadii,
  resolveSceneRectRadius,
} from './rect-radius-state-internal'
import {
  sceneMotionNode,
  type SceneMotionMetadata,
} from './scene-motion-internal'
import { valueKey } from './scales'
import { stackOuterEnds } from './stack-ends-internal'
import { stackValues } from './stack-internal'
import type {
  Channel,
  ChannelAccessor,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartBarStateStyle,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkChannelOutput,
  MarkScaleBindings,
  RectCornerRadii,
  RectRadius,
  ResolvedScale,
  SceneNode,
  SceneRect,
  VisualChannel,
} from './types'
import type { GroupLayout } from './group'
import type { StackLayout } from './stack'

type BarLayout = GroupLayout | StackLayout

export interface BarEndRadius<TDatum> {
  end: VisualChannel<TDatum, number>
  stack?: 'outer' | 'each'
}

export type BarRadius<TDatum> =
  VisualChannel<TDatum, RectRadius> | BarEndRadius<TDatum>

export interface BarYOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  y1?: number | Channel<TDatum, number | null | undefined>
  y2?: number | Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: VisualChannel<TDatum, string>
  layout?: BarLayout
  /** Pixels removed from both categorical edges after band layout. */
  inset?: number
  /** Maximum painted width in pixels after grouping and inset. */
  maxThickness?: number
  radius?: BarRadius<TDatum>
  states?: readonly ChartMarkState<TDatum, ChartBarStateStyle<TDatum>>[]
}

export interface BarXOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, number | null | undefined>
  x1?: number | Channel<TDatum, number | null | undefined>
  x2?: number | Channel<TDatum, number | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: VisualChannel<TDatum, string>
  layout?: BarLayout
  /** Pixels removed from both categorical edges after band layout. */
  inset?: number
  /** Maximum painted height in pixels after grouping and inset. */
  maxThickness?: number
  radius?: BarRadius<TDatum>
  states?: readonly ChartMarkState<TDatum, ChartBarStateStyle<TDatum>>[]
}

type BarYCallOptions<
  TDatum,
  TXChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  BarYOptions<NoInfer<TDatum>>,
  {
    x?: TXChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

type BarXCallOptions<
  TDatum,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  BarXOptions<NoInfer<TDatum>>,
  {
    y?: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

export function barY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function barY<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: BarYCallOptions<TDatum, TXChannel, TXScaleId, TYScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  number,
  MarkChannelOutput<TDatum, TXChannel, number>,
  number,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function barY<TDatum>(
  source: Iterable<TDatum>,
  options: BarYOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, BarYOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  const preferCornerRadii =
    typeof options.radius === 'function' ||
    markStatesMayUseCornerRadii(options.states)

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `bar-y-${markIndex}`
      const xValues = channelValues(
        data,
        options.x,
        (_datum, { index }) => index,
      )
      const rawYValues = numericChannelValues(
        data,
        options.y ?? options.y2,
        (datum) => (typeof datum === 'number' ? datum : undefined),
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const seriesValues =
        options.z === undefined && options.color !== undefined
          ? colorValues
          : zValues
      const explicitExtent =
        options.y1 !== undefined || options.y2 !== undefined
      if (explicitExtent && options.layout?.type === 'stack') {
        throw new TypeError(
          'A bar with explicit y1 or y2 endpoints cannot also configure a stack layout',
        )
      }
      const grouped = options.layout?.type === 'group'
      validateEndRadius(options.radius, explicitExtent, grouped, 'y')
      const stackLayout =
        options.layout?.type === 'stack' ? options.layout : undefined
      const endRadius = isBarEndRadius(options.radius)
        ? options.radius
        : undefined
      const divergingStack =
        stackLayout?.offset === undefined || stackLayout.offset === 'diverging'
      const stacked =
        !explicitExtent && !grouped
          ? stackValues(xValues, rawYValues, seriesValues, stackLayout, 'index')
          : undefined
      const outerEnds =
        stacked && endRadius && (endRadius.stack ?? 'outer') === 'outer'
          ? stackOuterEnds(
              xValues,
              rawYValues,
              seriesValues,
              stackLayout,
              'index',
            )
          : undefined
      const y1Values = explicitExtent
        ? numericChannelValues(data, options.y1, () => 0)
        : (stacked?.starts ?? data.map(() => 0))
      const y2Values = explicitExtent
        ? numericChannelValues(data, options.y2 ?? options.y, () => undefined)
        : grouped
          ? rawYValues
          : stacked!.ends
      const duplicatePositions = hasDuplicateValues(xValues)
      const groupValues =
        grouped || (!explicitExtent && duplicatePositions)
          ? seriesValues
          : zValues
      const keys = inferredKeyValues(data, options.key, {
        groups: groupValues,
        candidates: [xValues],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        states: markStates(data, options.states),
        seriesFromColor:
          options.z === undefined &&
          options.color !== undefined &&
          (grouped || duplicatePositions),
        channels: {
          x: { scale: xScale, values: xValues.filter(isChartValue) },
          y: {
            scale: yScale,
            values: [
              ...y2Values.filter(isFiniteNumber),
              ...y1Values.filter(isFiniteNumber),
            ],
            includeZero: options.y1 === undefined,
          },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, chart, color: resolveColor }) => {
          const totalBandwidth =
            scales[xScale]!.bandwidth ||
            inferBandwidth(scales[xScale]!, xValues, chart.width, data.length)
          const groupScale = resolveGroupScale(
            options.layout?.type === 'group' ? options.layout : undefined,
            groupValues,
            totalBandwidth,
          )
          const groupBandwidth = groupScale?.bandwidth ?? totalBandwidth
          const thickness = resolveBarThickness(
            groupBandwidth,
            options.inset,
            options.maxThickness,
          )
          const nodes: SceneNode[] = []

          data.forEach((datum, datumIndex) => {
            const xValue = xValues[datumIndex]
            const yValue = rawYValues[datumIndex]
            const y1Value = y1Values[datumIndex]
            const y2Value = y2Values[datumIndex]
            if (
              !isChartValue(xValue) ||
              !isFiniteNumber(yValue) ||
              !isFiniteNumber(y1Value) ||
              !isFiniteNumber(y2Value)
            )
              return
            const group = groupValues[datumIndex] ?? null
            const groupOffset = groupScale?.map(group) ?? 0
            const resolvedColor = resolveColor(colorValues[datumIndex])
            const fill = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              resolvedColor,
            )
            const stroke = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              'none',
            )
            const strokeDasharray = visualValue(
              options.strokeDasharray,
              datum,
              datumIndex,
              data,
              'none',
            )
            const center = scales[xScale]!.map(xValue)
            const baselinePosition = scales[yScale]!.map(y1Value)
            const valuePosition = scales[yScale]!.map(y2Value)
            const valueEnd =
              stacked && divergingStack && yValue < 0 ? 'start' : 'end'
            const semanticValuePosition =
              valueEnd === 'start' ? baselinePosition : valuePosition
            const semanticBaselinePosition =
              valueEnd === 'start' ? valuePosition : baselinePosition
            const x =
              center - totalBandwidth / 2 + groupOffset + thickness.inset
            const y = Math.min(baselinePosition, valuePosition)
            const width = thickness.size
            const height = Math.abs(baselinePosition - valuePosition)
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const resolvedRadius = resolveBarRadius(
              options.radius,
              datum,
              datumIndex,
              data,
              'y',
              semanticValuePosition,
              semanticBaselinePosition,
              outerEnds?.[datumIndex] ?? true,
              preferCornerRadii,
            )
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue,
              yValue,
              y1Value,
              y2Value,
              yInterval: 'difference',
              x: center - totalBandwidth / 2 + groupOffset + groupBandwidth / 2,
              y: semanticValuePosition,
              color: fill,
            }
            const node = {
              kind: 'rect',
              key,
              x,
              y,
              width,
              height,
              ...resolvedRadius,
              inset: thickness.inset,
              insetAxis: 'x',
              ...(thickness.maximum === undefined
                ? {}
                : { maxThickness: thickness.maximum }),
              interaction: { point, affinity: 'x' },
              style: {
                fill,
                fillOpacity: options.fillOpacity,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth,
                strokeDasharray,
              },
              [sceneMotionNode]: {
                bar: { baseline: semanticBaselinePosition },
              },
            } satisfies SceneRect & {
              readonly [sceneMotionNode]: SceneMotionMetadata
            }
            nodes.push(node)
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__bar ts-chart__bar-y',
                ariaHidden: true,
                children: nodes,
              },
            ],
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

export function barX<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function barX<
  TDatum,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: BarXCallOptions<TDatum, TYChannel, TXScaleId, TYScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  number,
  MarkChannelOutput<TDatum, TYChannel, number>,
  number,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function barX<TDatum>(
  source: Iterable<TDatum>,
  options: BarXOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, BarXOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  const preferCornerRadii =
    typeof options.radius === 'function' ||
    markStatesMayUseCornerRadii(options.states)

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `bar-x-${markIndex}`
      const rawXValues = numericChannelValues(
        data,
        options.x ?? options.x2,
        (datum) => (typeof datum === 'number' ? datum : undefined),
      )
      const yValues = channelValues(
        data,
        options.y,
        (_datum, { index }) => index,
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const seriesValues =
        options.z === undefined && options.color !== undefined
          ? colorValues
          : zValues
      const explicitExtent =
        options.x1 !== undefined || options.x2 !== undefined
      if (explicitExtent && options.layout?.type === 'stack') {
        throw new TypeError(
          'A bar with explicit x1 or x2 endpoints cannot also configure a stack layout',
        )
      }
      const grouped = options.layout?.type === 'group'
      validateEndRadius(options.radius, explicitExtent, grouped, 'x')
      const stackLayout =
        options.layout?.type === 'stack' ? options.layout : undefined
      const endRadius = isBarEndRadius(options.radius)
        ? options.radius
        : undefined
      const divergingStack =
        stackLayout?.offset === undefined || stackLayout.offset === 'diverging'
      const stacked =
        !explicitExtent && !grouped
          ? stackValues(yValues, rawXValues, seriesValues, stackLayout, 'index')
          : undefined
      const outerEnds =
        stacked && endRadius && (endRadius.stack ?? 'outer') === 'outer'
          ? stackOuterEnds(
              yValues,
              rawXValues,
              seriesValues,
              stackLayout,
              'index',
            )
          : undefined
      const x1Values = explicitExtent
        ? numericChannelValues(data, options.x1, () => 0)
        : (stacked?.starts ?? data.map(() => 0))
      const x2Values = explicitExtent
        ? numericChannelValues(data, options.x2 ?? options.x, () => undefined)
        : grouped
          ? rawXValues
          : stacked!.ends
      const duplicatePositions = hasDuplicateValues(yValues)
      const groupValues =
        grouped || (!explicitExtent && duplicatePositions)
          ? seriesValues
          : zValues
      const keys = inferredKeyValues(data, options.key, {
        groups: groupValues,
        candidates: [yValues],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        states: markStates(data, options.states),
        seriesFromColor:
          options.z === undefined &&
          options.color !== undefined &&
          (grouped || duplicatePositions),
        channels: {
          x: {
            scale: xScale,
            values: [
              ...x2Values.filter(isFiniteNumber),
              ...x1Values.filter(isFiniteNumber),
            ],
            includeZero: options.x1 === undefined,
          },
          y: { scale: yScale, values: yValues.filter(isChartValue) },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, chart, color: resolveColor }) => {
          const totalBandwidth =
            scales[yScale]!.bandwidth ||
            inferBandwidth(scales[yScale]!, yValues, chart.height, data.length)
          const groupScale = resolveGroupScale(
            options.layout?.type === 'group' ? options.layout : undefined,
            groupValues,
            totalBandwidth,
          )
          const groupBandwidth = groupScale?.bandwidth ?? totalBandwidth
          const thickness = resolveBarThickness(
            groupBandwidth,
            options.inset,
            options.maxThickness,
          )
          const nodes: SceneNode[] = []

          data.forEach((datum, datumIndex) => {
            const xValue = rawXValues[datumIndex]
            const x1Value = x1Values[datumIndex]
            const x2Value = x2Values[datumIndex]
            const yValue = yValues[datumIndex]
            if (
              !isFiniteNumber(xValue) ||
              !isFiniteNumber(x1Value) ||
              !isFiniteNumber(x2Value) ||
              !isChartValue(yValue)
            )
              return
            const group = groupValues[datumIndex] ?? null
            const groupOffset = groupScale?.map(group) ?? 0
            const resolvedColor = resolveColor(colorValues[datumIndex])
            const fill = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              resolvedColor,
            )
            const stroke = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              'none',
            )
            const strokeDasharray = visualValue(
              options.strokeDasharray,
              datum,
              datumIndex,
              data,
              'none',
            )
            const baselinePosition = scales[xScale]!.map(x1Value)
            const valuePosition = scales[xScale]!.map(x2Value)
            const valueEnd =
              stacked && divergingStack && xValue < 0 ? 'start' : 'end'
            const semanticValuePosition =
              valueEnd === 'start' ? baselinePosition : valuePosition
            const semanticBaselinePosition =
              valueEnd === 'start' ? valuePosition : baselinePosition
            const center = scales[yScale]!.map(yValue)
            const y =
              center - totalBandwidth / 2 + groupOffset + thickness.inset
            const x = Math.min(baselinePosition, valuePosition)
            const width = Math.abs(baselinePosition - valuePosition)
            const height = thickness.size
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const resolvedRadius = resolveBarRadius(
              options.radius,
              datum,
              datumIndex,
              data,
              'x',
              semanticValuePosition,
              semanticBaselinePosition,
              outerEnds?.[datumIndex] ?? true,
              preferCornerRadii,
            )
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue,
              yValue,
              x1Value,
              x2Value,
              xInterval: 'difference',
              x: semanticValuePosition,
              y: center - totalBandwidth / 2 + groupOffset + groupBandwidth / 2,
              color: fill,
            }
            const node = {
              kind: 'rect',
              key,
              x,
              y,
              width,
              height,
              ...resolvedRadius,
              inset: thickness.inset,
              insetAxis: 'y',
              ...(thickness.maximum === undefined
                ? {}
                : { maxThickness: thickness.maximum }),
              interaction: { point, affinity: 'y' },
              style: {
                fill,
                fillOpacity: options.fillOpacity,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth,
                strokeDasharray,
              },
              [sceneMotionNode]: {
                bar: { baseline: semanticBaselinePosition },
              },
            } satisfies SceneRect & {
              readonly [sceneMotionNode]: SceneMotionMetadata
            }
            nodes.push(node)
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__bar ts-chart__bar-x',
                ariaHidden: true,
                children: nodes,
              },
            ],
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function validateEndRadius<TDatum>(
  radius: BarRadius<TDatum> | undefined,
  explicitExtent: boolean,
  grouped: boolean,
  valueAxis: 'x' | 'y',
) {
  if (!isBarEndRadius(radius) || radius.stack !== 'outer') return
  if (explicitExtent) {
    throw new TypeError(
      `Bar radius stack "outer" requires an implicit ${valueAxis} extent`,
    )
  }
  if (grouped) {
    throw new TypeError(
      'Bar radius stack "outer" cannot be used with a group layout',
    )
  }
}

function resolveBarRadius<TDatum>(
  radius: BarRadius<TDatum> | undefined,
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
  valueAxis: 'x' | 'y',
  valuePosition: number,
  baselinePosition: number,
  outer: boolean,
  preferCornerRadii: boolean,
): Pick<SceneRect, 'radius' | 'cornerRadii'> {
  if (radius === undefined) {
    return resolveSceneRectRadius(undefined, preferCornerRadii)
  }
  if (isBarEndRadius(radius)) {
    const endRadius = visualValue(radius.end, datum, index, data, 0)
    if (valuePosition === baselinePosition) {
      return { cornerRadii: [0, 0, 0, 0] }
    }
    if ((radius.stack ?? 'outer') === 'outer' && !outer) {
      return { cornerRadii: [0, 0, 0, 0] }
    }
    return {
      cornerRadii: endCornerRadii(
        endRadius,
        valueAxis,
        valuePosition,
        baselinePosition,
      ),
    }
  }

  const resolved = visualValue(radius, datum, index, data, 0)
  return resolveSceneRectRadius(resolved, preferCornerRadii)
}

function isBarEndRadius<TDatum>(
  radius: BarRadius<TDatum> | undefined,
): radius is BarEndRadius<TDatum> {
  return (
    radius !== undefined &&
    radius !== null &&
    typeof radius === 'object' &&
    !Array.isArray(radius)
  )
}

function endCornerRadii(
  radius: number,
  valueAxis: 'x' | 'y',
  valuePosition: number,
  baselinePosition: number,
): RectCornerRadii {
  if (valueAxis === 'y') {
    return valuePosition <= baselinePosition
      ? [radius, radius, 0, 0]
      : [0, 0, radius, radius]
  }
  return valuePosition <= baselinePosition
    ? [radius, 0, 0, radius]
    : [0, radius, radius, 0]
}

function resolveBarThickness(
  bandwidth: number,
  insetOption: number | undefined,
  maxThicknessOption: number | undefined,
) {
  const authoredInset = Math.max(0, insetOption ?? 0)
  const resolvedBandwidth = Math.max(0, bandwidth)
  const available = Math.max(0, resolvedBandwidth - authoredInset * 2)
  const constrained = Number.isFinite(maxThicknessOption)
  const maximum = constrained ? Math.max(0, maxThicknessOption!) : available
  const size = Math.min(available, maximum)
  return {
    inset: (resolvedBandwidth - size) / 2,
    maximum: constrained ? maximum : undefined,
    size,
  }
}

function resolveGroupScale(
  source: GroupLayout | undefined,
  values: readonly unknown[],
  bandwidth: number,
) {
  if (!source) return undefined
  const scale = resolveScaleInput(
    source.scale ??
      (() =>
        scaleBand<ChartKey>().padding(
          Number.isFinite(source.padding) ? Math.max(0, source.padding!) : 0.1,
        )),
    { values },
  )
  scale.range([0, bandwidth])
  const groupBandwidth = scale.bandwidth?.()
  if (groupBandwidth === undefined) {
    throw new TypeError('A grouped bar layout requires a D3 band scale')
  }
  return {
    bandwidth: groupBandwidth,
    map(value: ChartKey | null) {
      if (value === null) {
        throw new TypeError(
          'A grouped bar requires an explicit z channel or a discrete color channel',
        )
      }
      const position = scale(value)
      if (position === undefined || !Number.isFinite(position)) {
        throw new TypeError(
          `Bar group value "${String(value)}" is outside the group layout scale domain`,
        )
      }
      return position
    },
  }
}

function hasDuplicateValues(values: readonly unknown[]) {
  const seen = new Set<string>()
  for (const value of values) {
    if (!isChartValue(value)) continue
    const identity = valueKey(value)
    if (seen.has(identity)) return true
    seen.add(identity)
  }
  return false
}

function inferBandwidth(
  scale: ResolvedScale,
  values: readonly unknown[],
  span: number,
  count: number,
): number {
  const positions = [
    ...new Set(
      values
        .filter(isChartValue)
        .map(scale.map)
        .filter((value) => Number.isFinite(value)),
    ),
  ].sort((a, b) => a - b)
  let minimum = Infinity
  for (let index = 1; index < positions.length; index += 1) {
    minimum = Math.min(minimum, positions[index] - positions[index - 1])
  }
  return Number.isFinite(minimum)
    ? minimum * 0.8
    : Math.min(48, (span / Math.max(2, count + 1)) * 0.8)
}

function numericChannelValues<TDatum>(
  data: readonly TDatum[],
  channel: number | Channel<TDatum, number | null | undefined> | undefined,
  fallback: ChannelAccessor<TDatum, number | null | undefined>,
) {
  return typeof channel === 'number'
    ? data.map(() => channel)
    : channelValues(data, channel, fallback)
}
