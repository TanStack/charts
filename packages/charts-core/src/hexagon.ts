import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isNonnegativeFiniteNumber,
  visualValue,
} from './mark'
import { resolveNumericScale } from './scale-input'
import { valueKey } from './scales'
import type {
  Channel,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartNumericScale,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkChannelOutput,
  MarkScaleBindings,
  SceneNode,
  VisualChannel,
} from './types'

export interface HexagonOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartNumericScale
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
}

type HexagonCallOptions<
  TDatum,
  TXChannel,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  HexagonOptions<TDatum>,
  {
    x?: TXChannel
    y?: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

/** Draws pointy-topped, fixed-pixel hexagons at scaled x/y positions. */
export function hexagon<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function hexagon<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | HexagonCallOptions<TDatum, TXChannel, TYChannel, TXScaleId, TYScaleId>
    | undefined,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkChannelOutput<TDatum, TXChannel, number>,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function hexagon<TDatum>(
  source: Iterable<TDatum>,
  options: HexagonOptions<TDatum> = {},
): CartesianChartMark<TDatum, any, any, any, any, HexagonOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `hexagon-${markIndex}`
      const xValues = channelValues(
        data,
        options.x,
        (_datum, { index }) => index,
      )
      const yValues = channelValues(data, options.y, (datum) =>
        typeof datum === 'number' ? datum : undefined,
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, { groups: zValues })
      const radiusOption = options.r
      const rawRadii =
        typeof radiusOption === 'number'
          ? data.map(() => radiusOption)
          : channelValues(data, radiusOption, () => 6)
      const radiusMapper = resolveNumericScale(options.rScale, rawRadii)
      const radii = radiusMapper
        ? rawRadii.map((radius) =>
            isNonnegativeFiniteNumber(radius)
              ? radiusMapper(radius)
              : Number.NaN,
          )
        : rawRadii

      return {
        id,
        channels: {
          x: { scale: xScale, values: xValues.filter(isChartValue) },
          y: { scale: yScale, values: yValues.filter(isChartValue) },
          color: { scale: 'color', values: colorValues.filter(isChartKey) },
        },
        render: ({ scales, color: resolveColor }) => {
          const nodes: SceneNode[] = []

          data.forEach((datum, datumIndex) => {
            const xValue = xValues[datumIndex]
            const yValue = yValues[datumIndex]
            const radius = radii[datumIndex]
            if (
              !isChartValue(xValue) ||
              !isChartValue(yValue) ||
              !isNonnegativeFiniteNumber(radius)
            ) {
              return
            }
            const x = scales[xScale]!.map(xValue)
            const y = scales[yScale]!.map(yValue)
            const group = zValues[datumIndex] ?? null
            const fallback = resolveColor(colorValues[datumIndex] ?? null)
            const fill = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              fallback,
            )
            const stroke =
              options.stroke === undefined
                ? undefined
                : visualValue(options.stroke, datum, datumIndex, data, fallback)
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const vertices = Array.from({ length: 6 }, (_, vertex) => {
              const angle = ((vertex * 60 - 90) * Math.PI) / 180
              return [
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
              ] as const
            })
            const point: ChartPoint<TDatum> = {
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
              color: fill,
            }

            nodes.push({
              kind: 'area',
              key,
              points: vertices,
              interaction: { point },
              style: {
                fill,
                fillOpacity: options.fillOpacity,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth,
              },
            })
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__hexagon',
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
