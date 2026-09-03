import { whenFocused } from './focus-mark'
import { createGuideNodes } from './guide-nodes-internal'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChannelOutput,
  CartesianScaleBindings,
  ChartFocusMatch,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartPoint,
  ChartValue,
  MarkRenderContext,
  SceneLabel,
  SceneNode,
  VisualChannel,
} from './types'

export interface FocusGuideRuleOptions<TDatum> {
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: VisualChannel<TDatum, number>
  strokeWidth?: VisualChannel<TDatum, number>
  strokeDasharray?: VisualChannel<TDatum, string>
  lineCap?: 'butt' | 'round' | 'square'
}

export interface FocusGuideMarkerOptions<TDatum> {
  radius?: VisualChannel<TDatum, number>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: VisualChannel<TDatum, number>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: VisualChannel<TDatum, number>
  strokeWidth?: VisualChannel<TDatum, number>
}

export interface FocusGuideLabelFormatContext<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  readonly point: ChartPoint<TDatum, TXValue, TYValue>
}

export interface FocusGuideLabelOptions<
  TDatum,
  TValue extends ChartValue,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  format?: (
    value: TValue,
    context: FocusGuideLabelFormatContext<TDatum, TXValue, TYValue>,
  ) => string
  side?: 'start' | 'end'
  offset?: number
  paddingX?: number
  paddingY?: number
  radius?: number
  background?: VisualChannel<TDatum, string>
  color?: VisualChannel<TDatum, string>
  stroke?: VisualChannel<TDatum, string>
  strokeWidth?: number
  fontSize?: number
  fontWeight?: number
}

type FocusGuideChannel<TDatum> = Channel<TDatum, ChartValue | null | undefined>

export interface FocusGuideOptions<
  TDatum,
  TXChannel extends FocusGuideChannel<TDatum>,
  TYChannel extends FocusGuideChannel<TDatum>,
>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x: TXChannel
  y: TYChannel
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  match?: ChartFocusMatch
  xRule?: false | FocusGuideRuleOptions<TDatum>
  yRule?: false | FocusGuideRuleOptions<TDatum>
  marker?: false | FocusGuideMarkerOptions<TDatum>
  xLabel?:
    | false
    | FocusGuideLabelOptions<
        TDatum,
        ChannelOutput<TDatum, TXChannel, number>,
        ChannelOutput<TDatum, TXChannel, number>,
        ChannelOutput<TDatum, TYChannel, number>
      >
  yLabel?:
    | false
    | FocusGuideLabelOptions<
        TDatum,
        ChannelOutput<TDatum, TYChannel, number>,
        ChannelOutput<TDatum, TXChannel, number>,
        ChannelOutput<TDatum, TYChannel, number>
      >
}

export function focusGuideX<
  TDatum,
  const TXChannel extends FocusGuideChannel<NoInfer<TDatum>>,
  const TYChannel extends FocusGuideChannel<NoInfer<TDatum>>,
  const TXScaleId extends string = 'x',
  const TYScaleId extends string = 'y',
>(
  source: Iterable<TDatum>,
  options: FocusGuideOptions<NoInfer<TDatum>, TXChannel, TYChannel> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
): ChartMark<
  TDatum,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  TXScaleId,
  TYScaleId
> {
  return focusGuide<TDatum, TXChannel, TYChannel, TXScaleId, TYScaleId>(
    source,
    options,
    'x',
  )
}

export function focusGuideY<
  TDatum,
  const TXChannel extends FocusGuideChannel<NoInfer<TDatum>>,
  const TYChannel extends FocusGuideChannel<NoInfer<TDatum>>,
  const TXScaleId extends string = 'x',
  const TYScaleId extends string = 'y',
>(
  source: Iterable<TDatum>,
  options: FocusGuideOptions<NoInfer<TDatum>, TXChannel, TYChannel> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
): ChartMark<
  TDatum,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  TXScaleId,
  TYScaleId
> {
  return focusGuide<TDatum, TXChannel, TYChannel, TXScaleId, TYScaleId>(
    source,
    options,
    'y',
  )
}

function focusGuide<
  TDatum,
  TXChannel extends FocusGuideChannel<TDatum>,
  TYChannel extends FocusGuideChannel<TDatum>,
  TXScaleId extends string,
  TYScaleId extends string,
>(
  source: Iterable<TDatum>,
  options: FocusGuideOptions<TDatum, TXChannel, TYChannel> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
  orientation: 'x' | 'y',
): ChartMark<
  TDatum,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  TXScaleId,
  TYScaleId
> {
  type TXValue = ChannelOutput<TDatum, TXChannel, number>
  type TYValue = ChannelOutput<TDatum, TYChannel, number>
  const xScale = (options.xScale ?? 'x') as TXScaleId
  const yScale = (options.yScale ?? 'y') as TYScaleId

  const data = Array.isArray(source) ? source : Array.from(source)
  const xRule =
    options.xRule === undefined
      ? orientation === 'x'
        ? {}
        : false
      : options.xRule
  const yRule =
    options.yRule === undefined
      ? orientation === 'y'
        ? {}
        : false
      : options.yRule

  const mark = createMark<TDatum, TXValue, TYValue, TXScaleId, TYScaleId>(
    ({ markIndex }) => {
      const id = options.id ?? `focus-guide-${orientation}-${markIndex}`
      const xValues = channelValues(data, options.x, () => undefined)
      const yValues = channelValues(data, options.y, () => undefined)
      const zValues = channelValues(data, options.z, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: zValues,
        candidates: [xValues, yValues],
        markId: id,
        warningIdentity: options,
      })

      const renderCandidates = (context: MarkRenderContext) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum, TXValue, TYValue>[] = []
        const labels: SceneLabel[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          if (!isChartValue(xValue) || !isChartValue(yValue)) return

          const group = zValues[datumIndex]
          const normalizedGroup = isChartKey(group) ? group : null
          const candidateKey = `${id}:${valueKey(normalizedGroup)}:${valueKey(keys[datumIndex])}`
          const color = context.theme.foreground
          const x = context.scales[xScale]!.map(xValue)
          const y = context.scales[yScale]!.map(yValue)
          if (!Number.isFinite(x) || !Number.isFinite(y)) return
          const point: ChartPoint<TDatum, TXValue, TYValue> = {
            key: `${candidateKey}:point`,
            markId: id,
            group: normalizedGroup,
            groupLabel: normalizedGroup === null ? id : String(normalizedGroup),
            datum,
            datumIndex,
            xValue: xValue as TXValue,
            yValue: yValue as TYValue,
            x,
            y,
            color,
          }
          const guide = createGuideNodes({
            id,
            classPrefix: 'ts-chart__focus-guide',
            chart: context.chart,
            x: point.x,
            y: point.y,
            xRule:
              xRule === false
                ? false
                : { style: ruleStyle(xRule, datum, datumIndex, data, context) },
            yRule:
              yRule === false
                ? false
                : { style: ruleStyle(yRule, datum, datumIndex, data, context) },
            marker: resolveMarker(
              options.marker,
              datum,
              datumIndex,
              data,
              context,
            ),
            xLabel: resolveLabel(
              options.xLabel,
              point.xValue,
              point,
              datum,
              datumIndex,
              data,
              context,
            ),
            yLabel: resolveLabel(
              options.yLabel,
              point.yValue,
              point,
              datum,
              datumIndex,
              data,
              context,
            ),
            measureText: context.layout.measureText,
          })
          labels.push(...guide.labels)

          nodes.push({
            kind: 'group',
            key: candidateKey,
            className: 'ts-chart__focus-guide-candidate',
            ariaHidden: true,
            focusCandidateIndex: points.length,
            children: guide.nodes,
          })
          points.push(point)
        })

        return { nodes, points, labels }
      }

      return {
        id,
        channels: {
          x: { scale: xScale, values: xValues.filter(isChartValue) },
          y: { scale: yScale, values: yValues.filter(isChartValue) },
        },
        layoutLabels: (context) => renderCandidates(context).labels,
        render: (context) => {
          const rendered = renderCandidates(context)
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: `ts-chart__focus-guide ts-chart__focus-guide-${orientation}`,
                ariaHidden: true,
                children: rendered.nodes,
              },
            ],
            points: rendered.points,
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )

  return whenFocused(mark, {
    match: options.match ?? 'primary',
    retarget: true,
  })
}

function ruleStyle<TDatum>(
  options: FocusGuideRuleOptions<TDatum>,
  datum: TDatum,
  datumIndex: number,
  data: readonly TDatum[],
  context: MarkRenderContext,
) {
  return {
    stroke: visualValue(
      options.stroke,
      datum,
      datumIndex,
      data,
      context.theme.foreground,
    ),
    strokeOpacity: visualValue(
      options.strokeOpacity,
      datum,
      datumIndex,
      data,
      0.48,
    ),
    strokeWidth: nonnegative(
      visualValue(options.strokeWidth, datum, datumIndex, data, 1),
      1,
    ),
    strokeDasharray: visualValue(
      options.strokeDasharray,
      datum,
      datumIndex,
      data,
      '4 4',
    ),
    lineCap: options.lineCap,
  }
}

function resolveMarker<TDatum>(
  marker: false | FocusGuideMarkerOptions<TDatum> | undefined,
  datum: TDatum,
  datumIndex: number,
  data: readonly TDatum[],
  context: MarkRenderContext,
) {
  if (marker === false || marker === undefined) return false
  return {
    radius: nonnegative(
      visualValue(marker.radius, datum, datumIndex, data, 5),
      5,
    ),
    style: {
      fill: visualValue(
        marker.fill,
        datum,
        datumIndex,
        data,
        context.theme.background,
      ),
      fillOpacity: visualValue(marker.fillOpacity, datum, datumIndex, data, 1),
      stroke: visualValue(
        marker.stroke,
        datum,
        datumIndex,
        data,
        context.theme.foreground,
      ),
      strokeOpacity: visualValue(
        marker.strokeOpacity,
        datum,
        datumIndex,
        data,
        1,
      ),
      strokeWidth: nonnegative(
        visualValue(marker.strokeWidth, datum, datumIndex, data, 1.5),
        1.5,
      ),
    },
  }
}

function resolveLabel<
  TDatum,
  TValue extends ChartValue,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  options:
    | false
    | FocusGuideLabelOptions<TDatum, TValue, TXValue, TYValue>
    | undefined,
  value: TValue,
  point: ChartPoint<TDatum, TXValue, TYValue>,
  datum: TDatum,
  datumIndex: number,
  data: readonly TDatum[],
  context: MarkRenderContext,
) {
  if (options === false || options === undefined) return false
  return {
    text: options.format?.(value, { point }) ?? String(value),
    side: options.side,
    offset: options.offset,
    paddingX: options.paddingX,
    paddingY: options.paddingY,
    radius: options.radius,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    style: {
      fill: visualValue(
        options.color,
        datum,
        datumIndex,
        data,
        context.theme.background,
      ),
    },
    boxStyle: {
      fill: visualValue(
        options.background,
        datum,
        datumIndex,
        data,
        context.theme.foreground,
      ),
      stroke: visualValue(
        options.stroke,
        datum,
        datumIndex,
        data,
        context.theme.background,
      ),
      strokeWidth: nonnegative(options.strokeWidth, 1),
    },
  }
}

function nonnegative(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}
