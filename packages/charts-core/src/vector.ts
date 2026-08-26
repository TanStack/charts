import { arrowGeometry } from './arrow-geometry'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  visualValue,
} from './mark'
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

export type VectorAnchor = 'start' | 'middle' | 'end'

export interface VectorOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  length?: number | Channel<TDatum, number | null | undefined>
  rotate?: number | Channel<TDatum, number | null | undefined>
  anchor?: VectorAnchor
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  headLength?: number
  headAngle?: number
}

type VectorCallOptions<
  TDatum,
  TXChannel,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  VectorOptions<NoInfer<TDatum>>,
  {
    x: TXChannel
    y: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

/**
 * Draws fixed-pixel vectors at scaled anchors. Rotation is clockwise in
 * degrees, with zero pointing up.
 */
export function vector<
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
  options: VectorCallOptions<
    TDatum,
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
export function vector<TDatum>(
  source: Iterable<TDatum>,
  options: VectorOptions<NoInfer<TDatum>>,
): CartesianChartMark<TDatum, any, any, any, any, VectorOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `vector-${markIndex}`
      const xValues = channelValues(data, options.x, () => undefined)
      const yValues = channelValues(data, options.y, () => undefined)
      const lengthOption = options.length
      const lengthValues =
        typeof lengthOption === 'number'
          ? data.map(() => lengthOption)
          : channelValues(data, lengthOption, () => 12)
      const rotateOption = options.rotate
      const rotateValues =
        typeof rotateOption === 'number'
          ? data.map(() => rotateOption)
          : channelValues(data, rotateOption, () => 0)
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
          color: { scale: 'color', values: colorValues.filter(isChartKey) },
        },
        render: ({ scales, color: resolveColor }) => {
          const nodes: SceneNode[] = []
          const points: ChartPoint<TDatum>[] = []
          const anchor = options.anchor ?? 'middle'
          const headLength = Math.max(0, options.headLength ?? 5)
          const headAngle = ((options.headAngle ?? 30) * Math.PI) / 180

          data.forEach((datum, datumIndex) => {
            const xValue = xValues[datumIndex]
            const yValue = yValues[datumIndex]
            const length = lengthValues[datumIndex]
            const rotate = rotateValues[datumIndex]
            if (
              !isChartValue(xValue) ||
              !isChartValue(yValue) ||
              !isFiniteNumber(length) ||
              !isFiniteNumber(rotate)
            ) {
              return
            }

            const x = scales[xScale]!.map(xValue)
            const y = scales[yScale]!.map(yValue)
            const radians = (rotate * Math.PI) / 180
            const dx = Math.sin(radians) * length
            const dy = -Math.cos(radians) * length
            const [x1, y1, x2, y2] =
              anchor === 'start'
                ? [x, y, x + dx, y + dy]
                : anchor === 'end'
                  ? [x - dx, y - dy, x, y]
                  : [x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2]
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
                className: 'ts-chart__vector-item',
              }),
            )
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
                className: 'ts-chart__vector',
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
