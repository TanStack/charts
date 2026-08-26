import {
  channelValues,
  compositeKeyValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  markStates,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartRectStateStyle,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkChannelOutput,
  MarkScaleBindings,
  SceneNode,
} from './types'

export interface RectOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  x1?: Channel<TDatum, ChartValue | null | undefined>
  x2?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  y1?: Channel<TDatum, ChartValue | null | undefined>
  y2?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  inset?: number
  radius?: number
  states?: readonly ChartMarkState<TDatum, ChartRectStateStyle<TDatum>>[]
}

export type CellOptions<TDatum> = Omit<
  RectOptions<TDatum>,
  'x1' | 'x2' | 'y1' | 'y2'
>

type RectCallOptions<
  TDatum,
  TXChannel,
  TX1Channel,
  TX2Channel,
  TYChannel,
  TY1Channel,
  TY2Channel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  RectOptions<NoInfer<TDatum>>,
  {
    x?: TXChannel
    x1?: TX1Channel
    x2?: TX2Channel
    y?: TYChannel
    y1?: TY1Channel
    y2?: TY2Channel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

type CellCallOptions<
  TDatum,
  TXChannel,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  CellOptions<NoInfer<TDatum>>,
  {
    x?: TXChannel
    y?: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

type RectEndpointOutput<TDatum, TEndpointChannel, TCenterChannel> = [
  NonNullable<TEndpointChannel>,
] extends [never]
  ? MarkChannelOutput<TDatum, TCenterChannel, number>
  : MarkChannelOutput<TDatum, TEndpointChannel, number>

type RectPointYChannelOutput<TDatum, TYChannel, TY2Channel> = [
  NonNullable<TYChannel>,
] extends [never]
  ? MarkChannelOutput<TDatum, TY2Channel, number>
  : MarkChannelOutput<TDatum, TYChannel, number>

export function rect<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TX1Channel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TX2Channel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TY1Channel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TY2Channel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: RectCallOptions<
    TDatum,
    TXChannel,
    TX1Channel,
    TX2Channel,
    TYChannel,
    TY1Channel,
    TY2Channel,
    TXScaleId,
    TYScaleId
  >,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  RectPointYChannelOutput<TDatum, TYChannel, TY2Channel>,
  | RectEndpointOutput<TDatum, TX1Channel, TXChannel>
  | RectEndpointOutput<TDatum, TX2Channel, TXChannel>,
  | RectEndpointOutput<TDatum, TY1Channel, TYChannel>
  | RectEndpointOutput<TDatum, TY2Channel, TYChannel>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function rect<TDatum>(
  source: Iterable<TDatum>,
  options: RectOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, RectOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `rect-${markIndex}`
      const xValues = channelValues(
        data,
        options.x,
        (_datum, { index }) => index,
      )
      const x1Values = channelValues(data, options.x1, (_datum, { index }) =>
        options.x === undefined ? index : xValues[index],
      )
      const x2Values = channelValues(
        data,
        options.x2,
        (_datum, { index }) => xValues[index],
      )
      const yValues = channelValues(data, options.y, (datum) =>
        typeof datum === 'number' ? datum : undefined,
      )
      const y1Values = channelValues(
        data,
        options.y1,
        (_datum, { index }) => yValues[index],
      )
      const y2Values = channelValues(
        data,
        options.y2,
        (_datum, { index }) => yValues[index],
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: zValues,
        candidates: [
          compositeKeyValues(x1Values, x2Values, y1Values, y2Values),
        ],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        states: markStates(data, options.states),
        channels: {
          x: {
            scale: xScale,
            values: [...x1Values, ...x2Values].filter(isChartValue),
          },
          y: {
            scale: yScale,
            values: [...y1Values, ...y2Values].filter(isChartValue),
          },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, color: resolveColor }) => {
          const nodes: SceneNode[] = []
          const inset = Math.max(0, options.inset ?? 0.75)

          data.forEach((datum, datumIndex) => {
            const xValue = xValues[datumIndex]
            const x1Value = x1Values[datumIndex]
            const x2Value = x2Values[datumIndex]
            const yValue = yValues[datumIndex]
            const y1Value = y1Values[datumIndex]
            const y2Value = y2Values[datumIndex]
            if (
              !isChartValue(x1Value) ||
              !isChartValue(x2Value) ||
              !isChartValue(y1Value) ||
              !isChartValue(y2Value)
            )
              return

            const x1 = scales[xScale]!.map(x1Value)
            const x2 = scales[xScale]!.map(x2Value)
            const y1 = scales[yScale]!.map(y1Value)
            const y2 = scales[yScale]!.map(y2Value)
            const categoricalWidth =
              valueKey(x1Value) === valueKey(x2Value)
                ? scales[xScale]!.bandwidth
                : 0
            const categoricalHeight =
              valueKey(y1Value) === valueKey(y2Value)
                ? scales[yScale]!.bandwidth
                : 0
            const left =
              categoricalWidth > 0
                ? x1 - categoricalWidth / 2
                : Math.min(x1, x2)
            const top =
              categoricalHeight > 0
                ? y1 - categoricalHeight / 2
                : Math.min(y1, y2)
            const width = categoricalWidth || Math.max(0, Math.abs(x2 - x1))
            const height = categoricalHeight || Math.max(0, Math.abs(y2 - y1))
            const group = zValues[datumIndex] ?? null
            const color =
              options.fill ?? resolveColor(colorValues[datumIndex] ?? null)
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const paintedX = left + inset
            const paintedY = top + inset
            const paintedWidth = Math.max(0, width - inset * 2)
            const paintedHeight = Math.max(0, height - inset * 2)
            const pointXValue = isChartValue(xValue) ? xValue : x2Value
            const pointYValue = isChartValue(yValue) ? yValue : y2Value
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue: pointXValue,
              yValue: pointYValue,
              x1Value,
              x2Value,
              y1Value,
              y2Value,
              xInterval: 'range',
              yInterval: 'range',
              x: left + width / 2,
              y: top + height / 2,
              color,
            }
            nodes.push({
              kind: 'rect',
              key,
              x: paintedX,
              y: paintedY,
              width: paintedWidth,
              height: paintedHeight,
              radius: options.radius,
              inset,
              interaction: { point },
              style: {
                fill: color,
                fillOpacity: options.fillOpacity,
                stroke: options.stroke,
                strokeWidth: options.strokeWidth,
              },
            })
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__rect',
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

export function cell<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: CellCallOptions<TDatum, TXChannel, TYChannel, TXScaleId, TYScaleId>,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkChannelOutput<TDatum, TXChannel, number>,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function cell<TDatum>(
  source: Iterable<TDatum>,
  options: CellOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, CellOptions<TDatum>> {
  return rect(source, options)
}
