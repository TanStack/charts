import {
  channelValues,
  compositeKeyValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isNonnegativeFiniteNumber,
  markStates,
} from './mark'
import { resolveNumericScale } from './scale-input'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartDotStateStyle,
  ChartNumericScale,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
} from './types'

export interface DotOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartNumericScale
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  states?: readonly ChartMarkState<TDatum, ChartDotStateStyle<TDatum>>[]
}

export function dot<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function dot<
  TDatum,
  const TOptions extends DotOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
>
export function dot<TDatum>(
  source: Iterable<TDatum>,
  options: DotOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `dot-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, {
      groups: zValues,
      candidates: [xValues, yValues, compositeKeyValues(xValues, yValues)],
      markId: id,
      warningIdentity: options,
    })
    const rawRadii =
      typeof options.r === 'number'
        ? data.map(() => options.r as number)
        : channelValues(data, options.r, () => 3.5)
    const radiusMapper = resolveNumericScale(options.rScale, rawRadii)
    const radii = radiusMapper
      ? rawRadii.map((value) =>
          isNonnegativeFiniteNumber(value) ? radiusMapper(value) : Number.NaN,
        )
      : rawRadii

    return {
      id,
      states: markStates(data, options.states),
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
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
          )
            return
          const group = zValues[datumIndex] ?? null
          const groupKey = valueKey(group)
          const color =
            options.fill ?? resolveColor(colorValues[datumIndex] ?? null)
          const x = scales.x.map(xValue)
          const y = scales.y.map(yValue)
          const key = `${id}:${groupKey}:${valueKey(keys[datumIndex])}`
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
            color,
          }
          nodes.push({
            kind: 'dot',
            key,
            x,
            y,
            radius,
            interaction: { point },
            style: {
              fill: color,
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
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
              className: 'ts-chart__dot',
              ariaHidden: true,
              children: nodes,
            },
          ],
        }
      },
    }
  }, options.motion)
}
