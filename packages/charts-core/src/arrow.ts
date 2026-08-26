import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  visualValue,
} from './mark'
import { arrowGeometry } from './arrow-geometry'
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
  SceneNode,
  VisualChannel,
} from './types'

export interface ArrowOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x1: Channel<TDatum, ChartValue | null | undefined>
  y1: Channel<TDatum, ChartValue | null | undefined>
  x2: Channel<TDatum, ChartValue | null | undefined>
  y2: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  headLength?: number
  headAngle?: number
}

type ArrowXOutput<TDatum, TOptions> =
  | ChannelOutput<TDatum, TOptions extends { x1: infer T } ? T : never, number>
  | ChannelOutput<TDatum, TOptions extends { x2: infer T } ? T : never, number>

type ArrowYOutput<TDatum, TOptions> =
  | ChannelOutput<TDatum, TOptions extends { y1: infer T } ? T : never, number>
  | ChannelOutput<TDatum, TOptions extends { y2: infer T } ? T : never, number>

/** Draws one straight directed segment per datum with a scale-independent head. */
export function arrow<
  TDatum,
  const TOptions extends ArrowOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  TDatum,
  ArrowXOutput<TDatum, TOptions>,
  ArrowYOutput<TDatum, TOptions>,
  ArrowXOutput<TDatum, TOptions>,
  ArrowYOutput<TDatum, TOptions>,
  TOptions
>
export function arrow<TDatum>(
  source: Iterable<TDatum>,
  options: ArrowOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, ArrowOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `arrow-${markIndex}`
      const x1Values = channelValues(data, options.x1, () => undefined)
      const y1Values = channelValues(data, options.y1, () => undefined)
      const x2Values = channelValues(data, options.x2, () => undefined)
      const y2Values = channelValues(data, options.y2, () => undefined)
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, { groups: zValues })

      return {
        id,
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
          const points: ChartPoint<TDatum>[] = []
          const headLength = Math.max(0, options.headLength ?? 8)
          const headAngle = ((options.headAngle ?? 30) * Math.PI) / 180

          data.forEach((datum, datumIndex) => {
            const x1Value = x1Values[datumIndex]
            const y1Value = y1Values[datumIndex]
            const x2Value = x2Values[datumIndex]
            const y2Value = y2Values[datumIndex]
            if (
              !isChartValue(x1Value) ||
              !isChartValue(y1Value) ||
              !isChartValue(x2Value) ||
              !isChartValue(y2Value)
            ) {
              return
            }

            const x1 = scales[xScale]!.map(x1Value)
            const y1 = scales[yScale]!.map(y1Value)
            const x2 = scales[xScale]!.map(x2Value)
            const y2 = scales[yScale]!.map(y2Value)
            const group = zValues[datumIndex] ?? null
            const color = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              resolveColor(colorValues[datumIndex] ?? null),
            )
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const style = {
              stroke: color,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1.5,
              lineCap: 'round' as const,
              lineJoin: 'round' as const,
            }
            nodes.push(
              arrowGeometry({
                key,
                x1,
                y1,
                x2,
                y2,
                headLength,
                headAngle,
                style,
              }),
            )
            points.push({
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue: x2Value,
              yValue: y2Value,
              x1Value,
              x2Value,
              y1Value,
              y2Value,
              xInterval: 'range',
              yInterval: 'range',
              x: x2,
              y: y2,
              color,
            })
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__arrow',
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
