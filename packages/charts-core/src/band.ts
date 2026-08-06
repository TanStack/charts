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
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
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
  inset?: number
  radius?: number
}

export interface BandYOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  inset?: number
  radius?: number
}

export function bandX<
  TDatum,
  const TOptions extends BandXOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options?: TOptions,
): ChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  number,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  never
> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const resolved = options ?? ({} as BandXOptions<NoInfer<TDatum>>)

  return createMarkWithScaleValues(({ markIndex }) => {
    const id = resolved.id ?? `band-x-${markIndex}`
    const values = channelValues(data, resolved.x, (_datum, index) => index)
    const zValues = channelValues(data, resolved.z, () => null)
    const colorValues =
      resolved.color === undefined
        ? zValues
        : channelValues(data, resolved.color, () => null)
    const keys = inferredKeyValues(data, resolved.key, {
      groups: zValues,
      candidates: [values],
      markId: id,
      warningIdentity: resolved,
    })

    return {
      id,
      channels: {
        x: { scale: 'x', values: values.filter(isChartValue) },
        color: { scale: 'color', values: colorValues.filter(isChartKey) },
      },
      render: ({ chart, scales, color }) => {
        const width =
          scales.x.bandwidth ||
          inferBandwidth(scales.x, values, chart.width, data.length)
        const inset = Number.isFinite(resolved.inset) ? resolved.inset! : 0
        const nodes: SceneNode[] = []
        data.forEach((datum, index) => {
          const xValue = values[index]
          if (!isChartValue(xValue)) return
          const x = scales.x.map(xValue)
          const fill = visualValue(
            resolved.fill,
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
            radius: resolved.radius,
            interaction: { point, affinity: 'x' },
            style: { fill, fillOpacity: resolved.fillOpacity },
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
  }, resolved.motion) as ChartMark<
    TDatum,
    OptionChannelOutput<TDatum, TOptions, 'x', number>,
    number,
    OptionChannelOutput<TDatum, TOptions, 'x', number>,
    never
  >
}

export function bandY<
  TDatum,
  const TOptions extends BandYOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options?: TOptions,
): ChartMark<
  TDatum,
  number,
  OptionChannelOutput<TDatum, TOptions, 'y', number>,
  never,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const resolved = options ?? ({} as BandYOptions<NoInfer<TDatum>>)

  return createMark(({ markIndex }) => {
    const id = resolved.id ?? `band-y-${markIndex}`
    const values = channelValues(data, resolved.y, (_datum, index) => index)
    const zValues = channelValues(data, resolved.z, () => null)
    const colorValues =
      resolved.color === undefined
        ? zValues
        : channelValues(data, resolved.color, () => null)
    const keys = inferredKeyValues(data, resolved.key, {
      groups: zValues,
      candidates: [values],
      markId: id,
      warningIdentity: resolved,
    })

    return {
      id,
      channels: {
        y: { scale: 'y', values: values.filter(isChartValue) },
        color: { scale: 'color', values: colorValues.filter(isChartKey) },
      },
      render: ({ chart, scales, color }) => {
        const height =
          scales.y.bandwidth ||
          inferBandwidth(scales.y, values, chart.height, data.length)
        const inset = Number.isFinite(resolved.inset) ? resolved.inset! : 0
        const nodes: SceneNode[] = []
        data.forEach((datum, index) => {
          const yValue = values[index]
          if (!isChartValue(yValue)) return
          const y = scales.y.map(yValue)
          const fill = visualValue(
            resolved.fill,
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
            radius: resolved.radius,
            interaction: { point, affinity: 'y' },
            style: { fill, fillOpacity: resolved.fillOpacity },
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
  }, resolved.motion) as ChartMark<
    TDatum,
    number,
    OptionChannelOutput<TDatum, TOptions, 'y', number>,
    never,
    OptionChannelOutput<TDatum, TOptions, 'y', number>
  >
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
