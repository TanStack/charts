import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  visualValue,
} from './mark'
import {
  isResolvedCategoryScale,
  resolvedCategoryStep,
} from './mapped-spacing-internal'
import { valueKey } from './scales'
import type {
  Channel,
  ChannelOutput,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkScaleBindings,
  SceneNode,
  VisualChannel,
} from './types'

export interface TickXOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  length?: number
  /** Total tick length in orthogonal category-step units. */
  span?: number
  inset?: number
}

export interface TickYOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  length?: number
  /** Total tick length in orthogonal category-step units. */
  span?: number
  inset?: number
}

type TickCallOptions<
  TOptions,
  TXChannel,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  TOptions,
  {
    x: TXChannel
    y: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

export function tickX<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: TickCallOptions<
    TickXOptions<NoInfer<TDatum>>,
    TXChannel,
    TYChannel,
    TXScaleId,
    TYScaleId
  >,
): CartesianChartMark<
  TDatum,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function tickX<TDatum>(
  source: Iterable<TDatum>,
  options: TickXOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, TickXOptions<TDatum>> {
  return tick(source, options, 'x')
}

export function tickY<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: TickCallOptions<
    TickYOptions<NoInfer<TDatum>>,
    TXChannel,
    TYChannel,
    TXScaleId,
    TYScaleId
  >,
): CartesianChartMark<
  TDatum,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function tickY<TDatum>(
  source: Iterable<TDatum>,
  options: TickYOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, TickYOptions<TDatum>> {
  return tick(source, options, 'y')
}

function tick<TDatum>(
  source: Iterable<TDatum>,
  options: TickXOptions<NoInfer<TDatum>> | TickYOptions<NoInfer<TDatum>>,
  orientation: 'x' | 'y',
): CartesianChartMark<
  TDatum,
  any,
  any,
  any,
  any,
  TickXOptions<TDatum> | TickYOptions<TDatum>
> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  if (options.length !== undefined && options.span !== undefined) {
    throw new TypeError('tick: length and span are mutually exclusive')
  }
  if (
    options.span !== undefined &&
    (!isFiniteNumber(options.span) || options.span <= 0)
  ) {
    throw new TypeError('tick: span must be a positive finite number')
  }

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `tick-${orientation}-${markIndex}`
      const xValues = channelValues(data, options.x, () => undefined)
      const yValues = channelValues(data, options.y, () => undefined)
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, { groups: zValues })

      return {
        id,
        channels: {
          x: { scale: xScale, values: xValues.filter(isChartValue) },
          y: { scale: yScale, values: yValues.filter(isChartValue) },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ chart, scales, color: resolveColor }) => {
          const nodes: SceneNode[] = []
          const points: ChartPoint<TDatum>[] = []
          const orthogonalScale =
            orientation === 'x' ? scales[yScale]! : scales[xScale]!
          const bandwidth = orthogonalScale.bandwidth
          if (
            options.span !== undefined &&
            !isResolvedCategoryScale(orthogonalScale)
          ) {
            throw new TypeError(
              `tick${orientation.toUpperCase()}: span requires a point or band scale on the orthogonal axis`,
            )
          }
          const spanLength =
            options.span === undefined
              ? undefined
              : resolvedCategoryStep(
                  orthogonalScale,
                  orientation === 'x' ? chart.height : chart.width,
                  options.span,
                ) * options.span
          const availableLength = Math.max(
            0,
            (spanLength ?? options.length ?? (bandwidth || 6)) -
              (options.inset ?? 0) * 2,
          )

          data.forEach((datum, datumIndex) => {
            const xValue = xValues[datumIndex]
            const yValue = yValues[datumIndex]
            if (!isChartValue(xValue) || !isChartValue(yValue)) return

            const x = scales[xScale]!.map(xValue)
            const y = scales[yScale]!.map(yValue)
            const group = zValues[datumIndex] ?? null
            const color = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              resolveColor(colorValues[datumIndex] ?? null),
            )
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            nodes.push({
              kind: 'rule',
              key,
              x1: orientation === 'x' ? x : x - availableLength / 2,
              x2: orientation === 'x' ? x : x + availableLength / 2,
              y1: orientation === 'x' ? y - availableLength / 2 : y,
              y2: orientation === 'x' ? y + availableLength / 2 : y,
              style: {
                stroke: color,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth ?? 1.5,
                lineCap: 'butt',
              },
            })
            points.push({
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue,
              yValue,
              x,
              y,
              color,
            })
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: `ts-chart__tick ts-chart__tick-${orientation}`,
                ariaHidden: true,
                children: nodes,
              },
            ],
            points,
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}
