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
  ChannelOutput,
  ChartKey,
  ChartMark,
  ChartMarkState,
  ChartRectStateStyle,
  ChartPoint,
  ChartValue,
  SceneNode,
} from './types'

export interface RectOptions<TDatum> {
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

type RectSideOutput<
  TDatum,
  TOptions,
  TEndpoint extends PropertyKey,
  TCenter extends PropertyKey,
> = TOptions extends unknown
  ? TEndpoint extends keyof TOptions
    ? ChannelOutput<TDatum, TOptions[TEndpoint], number>
    : TCenter extends keyof TOptions
      ? ChannelOutput<TDatum, TOptions[TCenter], number>
      : number
  : never

type RectXOutput<TDatum, TOptions> =
  | RectSideOutput<TDatum, TOptions, 'x1', 'x'>
  | RectSideOutput<TDatum, TOptions, 'x2', 'x'>

type RectYOutput<TDatum, TOptions> =
  | RectSideOutput<TDatum, TOptions, 'y1', 'y'>
  | RectSideOutput<TDatum, TOptions, 'y2', 'y'>

type RectPointXOutput<TDatum, TOptions> = TOptions extends unknown
  ? 'x' extends keyof TOptions
    ? ChannelOutput<TDatum, TOptions['x'], number>
    : number
  : never

type RectPointYOutput<TDatum, TOptions> = TOptions extends unknown
  ? 'y' extends keyof TOptions
    ? ChannelOutput<TDatum, TOptions['y'], number>
    : 'y2' extends keyof TOptions
      ? ChannelOutput<TDatum, TOptions['y2'], number>
      : number
  : never

export function rect<
  TDatum,
  const TOptions extends RectOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  RectPointXOutput<TDatum, TOptions>,
  RectPointYOutput<TDatum, TOptions>,
  RectXOutput<TDatum, TOptions>,
  RectYOutput<TDatum, TOptions>
>
export function rect<TDatum>(
  source: Iterable<TDatum>,
  options: RectOptions<NoInfer<TDatum>>,
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `rect-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const x1Values = channelValues(data, options.x1, (_datum, index) =>
      options.x === undefined ? index : xValues[index],
    )
    const x2Values = channelValues(
      data,
      options.x2,
      (_datum, index) => xValues[index],
    )
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const y1Values = channelValues(
      data,
      options.y1,
      (_datum, index) => yValues[index],
    )
    const y2Values = channelValues(
      data,
      options.y2,
      (_datum, index) => yValues[index],
    )
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, {
      groups: zValues,
      candidates: [compositeKeyValues(x1Values, x2Values, y1Values, y2Values)],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      states: markStates(data, options.states),
      channels: {
        x: {
          scale: 'x',
          values: [...x1Values, ...x2Values].filter(isChartValue),
        },
        y: {
          scale: 'y',
          values: [...y1Values, ...y2Values].filter(isChartValue),
        },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
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

          const x1 = scales.x.map(x1Value)
          const x2 = scales.x.map(x2Value)
          const y1 = scales.y.map(y1Value)
          const y2 = scales.y.map(y2Value)
          const categoricalWidth =
            valueKey(x1Value) === valueKey(x2Value) ? scales.x.bandwidth : 0
          const categoricalHeight =
            valueKey(y1Value) === valueKey(y2Value) ? scales.y.bandwidth : 0
          const left =
            categoricalWidth > 0 ? x1 - categoricalWidth / 2 : Math.min(x1, x2)
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
          nodes.push({
            kind: 'rect',
            key,
            x: left + inset,
            y: top + inset,
            width: Math.max(0, width - inset * 2),
            height: Math.max(0, height - inset * 2),
            radius: options.radius,
            inset,
            style: {
              fill: color,
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
              strokeWidth: options.strokeWidth,
            },
          })

          const pointXValue = isChartValue(xValue) ? xValue : x2Value
          const pointYValue = isChartValue(yValue) ? yValue : y2Value
          points.push({
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
          points,
        }
      },
    }
  })
}

export function cell<
  TDatum,
  const TOptions extends CellOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  RectPointXOutput<TDatum, TOptions>,
  RectPointYOutput<TDatum, TOptions>,
  RectXOutput<TDatum, TOptions>,
  RectYOutput<TDatum, TOptions>
>
export function cell<TDatum>(
  source: Iterable<TDatum>,
  options: CellOptions<NoInfer<TDatum>>,
): ChartMark<TDatum> {
  return rect(source, options)
}
