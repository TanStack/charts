import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  visualValue,
} from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { minimumMappedSpacing } from './mapped-spacing-internal'
import { valueKey } from './scales'
import type {
  Channel,
  CartesianChartMark,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkChannelOutput,
  MarkScaleBindings,
  ResolvedScale,
  SceneNode,
  VisualChannel,
} from './types'

export interface BandXOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  width?: number
  inset?: number
  radius?: number
  xScale?: string
}

export interface BandYOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  height?: number
  inset?: number
  radius?: number
  yScale?: string
}

type BandXCallOptions<
  TDatum,
  TXChannel,
  TXScaleId extends string | undefined,
> = MarkCallOptions<
  BandXOptions<NoInfer<TDatum>>,
  {
    x?: TXChannel
    xScale?: TXScaleId
  }
>

type BandYCallOptions<
  TDatum,
  TYChannel,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  BandYOptions<NoInfer<TDatum>>,
  {
    y?: TYChannel
    yScale?: TYScaleId
  }
>

export function bandX<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function bandX<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: BandXCallOptions<TDatum, TXChannel, TXScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  number,
  MarkChannelOutput<TDatum, TXChannel, number>,
  never,
  MarkScaleBindings<TXScaleId, 'y'>
>
export function bandX<TDatum>(
  source: Iterable<TDatum>,
  options: BandXOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, BandXOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'

  return createMarkWithScaleValues(
    ({ markIndex }) => {
      const id = options.id ?? `band-x-${markIndex}`
      const values = channelValues(
        data,
        options.x,
        (_datum, { index }) => index,
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: zValues,
        candidates: [values],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        channels: {
          x: { scale: xScale, values: values.filter(isChartValue) },
          color: { scale: 'color', values: colorValues.filter(isChartKey) },
        },
        render: ({ chart, scales, color }) => {
          const width = Number.isFinite(options.width)
            ? Math.max(0, options.width!)
            : scales[xScale]!.bandwidth ||
              inferBandwidth(scales[xScale]!, values, chart.width, data.length)
          const inset = Number.isFinite(options.inset) ? options.inset! : 0
          const nodes: SceneNode[] = []
          data.forEach((datum, index) => {
            const xValue = values[index]
            if (!isChartValue(xValue)) return
            const x = scales[xScale]!.map(xValue)
            const fill = visualValue(
              options.fill,
              datum,
              index,
              data,
              color(colorValues[index]),
            )
            const group = zValues[index] ?? null
            const key = `${id}:${valueKey(group)}:${valueKey(keys[index])}`
            const left = x - width / 2 + inset
            const paintedWidth = Math.max(0, width - inset * 2)
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex: index,
              xValue,
              yValue: 0,
              x,
              y: chart.y + chart.height / 2,
              color: fill,
            }
            nodes.push({
              kind: 'rect',
              key,
              x: left,
              y: chart.y,
              width: paintedWidth,
              height: chart.height,
              radius: options.radius,
              interaction: { point, affinity: 'x' },
              style: { fill, fillOpacity: options.fillOpacity },
            })
          })
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__band ts-chart__band-x',
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

export function bandY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function bandY<
  TDatum,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: BandYCallOptions<TDatum, TYChannel, TYScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  number,
  MarkChannelOutput<TDatum, TYChannel, number>,
  never,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<'x', TYScaleId>
>
export function bandY<TDatum>(
  source: Iterable<TDatum>,
  options: BandYOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, BandYOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `band-y-${markIndex}`
      const values = channelValues(
        data,
        options.y,
        (_datum, { index }) => index,
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: zValues,
        candidates: [values],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        channels: {
          y: { scale: yScale, values: values.filter(isChartValue) },
          color: { scale: 'color', values: colorValues.filter(isChartKey) },
        },
        render: ({ chart, scales, color }) => {
          const height = Number.isFinite(options.height)
            ? Math.max(0, options.height!)
            : scales[yScale]!.bandwidth ||
              inferBandwidth(scales[yScale]!, values, chart.height, data.length)
          const inset = Number.isFinite(options.inset) ? options.inset! : 0
          const nodes: SceneNode[] = []
          data.forEach((datum, index) => {
            const yValue = values[index]
            if (!isChartValue(yValue)) return
            const y = scales[yScale]!.map(yValue)
            const fill = visualValue(
              options.fill,
              datum,
              index,
              data,
              color(colorValues[index]),
            )
            const group = zValues[index] ?? null
            const key = `${id}:${valueKey(group)}:${valueKey(keys[index])}`
            const top = y - height / 2 + inset
            const paintedHeight = Math.max(0, height - inset * 2)
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex: index,
              xValue: 0,
              yValue,
              x: chart.x + chart.width / 2,
              y,
              color: fill,
            }
            nodes.push({
              kind: 'rect',
              key,
              x: chart.x,
              y: top,
              width: chart.width,
              height: paintedHeight,
              radius: options.radius,
              interaction: { point, affinity: 'y' },
              style: { fill, fillOpacity: options.fillOpacity },
            })
          })
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__band ts-chart__band-y',
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

function inferBandwidth(
  scale: ResolvedScale,
  values: readonly unknown[],
  span: number,
  count: number,
): number {
  const spacing = minimumMappedSpacing(scale, values)
  return spacing !== undefined
    ? spacing * 0.8
    : Math.min(48, (span / Math.max(2, count + 1)) * 0.8)
}
