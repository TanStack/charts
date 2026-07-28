import {
  channelValues,
  createMark,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  ResolvedScale,
  SceneNode,
  VisualChannel,
} from './types'

export interface BarYOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  y1?: number | Channel<TDatum, number | null | undefined>
  y2?: number | Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  layout?: 'grouped' | 'overlay'
  inset?: number
  radius?: number
}

export interface BarXOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, number | null | undefined>
  x1?: number | Channel<TDatum, number | null | undefined>
  x2?: number | Channel<TDatum, number | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  layout?: 'grouped' | 'overlay'
  inset?: number
  radius?: number
}

export function barY<TDatum>(
  source: Iterable<TDatum>,
  options: BarYOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `bar-y-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = numericChannelValues(
      data,
      options.y2 ?? options.y,
      (datum) => (typeof datum === 'number' ? datum : undefined),
    )
    const y1Values = numericChannelValues(data, options.y1, () => 0)
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: {
          scale: 'y',
          values: [
            ...yValues.filter(isFiniteNumber),
            ...y1Values.filter(isFiniteNumber),
          ],
          includeZero: options.y1 === undefined,
        },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, color: resolveColor }) => {
        const groups = orderedGroups(zValues)
        const layout =
          options.layout ?? (options.y1 === undefined ? 'grouped' : 'overlay')
        const totalBandwidth =
          scales.x.bandwidth ||
          inferBandwidth(scales.x, xValues, chart.width, data.length)
        const groupBandwidth =
          layout === 'grouped' ? totalBandwidth / groups.size : totalBandwidth
        const inset = Math.max(0, options.inset ?? 1)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          const y1Value = y1Values[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isFiniteNumber(yValue) ||
            !isFiniteNumber(y1Value)
          )
            return
          const group = zValues[datumIndex] ?? null
          const groupIndex = groups.get(valueKey(group)) ?? 0
          const resolvedColor = resolveColor(group)
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolvedColor,
          )
          const center = scales.x.map(xValue)
          const baselinePosition = scales.y.map(y1Value)
          const valuePosition = scales.y.map(yValue)
          const x =
            center -
            totalBandwidth / 2 +
            (layout === 'grouped' ? groupIndex * groupBandwidth : 0) +
            inset
          const y = Math.min(baselinePosition, valuePosition)
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'rect',
            key,
            x,
            y,
            width: Math.max(0, groupBandwidth - inset * 2),
            height: Math.abs(baselinePosition - valuePosition),
            radius: options.radius,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
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
            x:
              center -
              totalBandwidth / 2 +
              (layout === 'grouped' ? groupIndex + 0.5 : 0.5) * groupBandwidth,
            y: valuePosition,
            color: resolvedColor,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__bar ts-chart__bar-y',
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

export function barX<TDatum>(
  source: Iterable<TDatum>,
  options: BarXOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `bar-x-${markIndex}`
    const xValues = numericChannelValues(
      data,
      options.x2 ?? options.x,
      (datum) => (typeof datum === 'number' ? datum : undefined),
    )
    const x1Values = numericChannelValues(data, options.x1, () => 0)
    const yValues = channelValues(data, options.y, (_datum, index) => index)
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: [
            ...xValues.filter(isFiniteNumber),
            ...x1Values.filter(isFiniteNumber),
          ],
          includeZero: options.x1 === undefined,
        },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, color: resolveColor }) => {
        const groups = orderedGroups(zValues)
        const layout =
          options.layout ?? (options.x1 === undefined ? 'grouped' : 'overlay')
        const totalBandwidth =
          scales.y.bandwidth ||
          inferBandwidth(scales.y, yValues, chart.height, data.length)
        const groupBandwidth =
          layout === 'grouped' ? totalBandwidth / groups.size : totalBandwidth
        const inset = Math.max(0, options.inset ?? 1)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const x1Value = x1Values[datumIndex]
          const yValue = yValues[datumIndex]
          if (
            !isFiniteNumber(xValue) ||
            !isFiniteNumber(x1Value) ||
            !isChartValue(yValue)
          )
            return
          const group = zValues[datumIndex] ?? null
          const groupIndex = groups.get(valueKey(group)) ?? 0
          const resolvedColor = resolveColor(group)
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolvedColor,
          )
          const baselinePosition = scales.x.map(x1Value)
          const valuePosition = scales.x.map(xValue)
          const center = scales.y.map(yValue)
          const y =
            center -
            totalBandwidth / 2 +
            (layout === 'grouped' ? groupIndex * groupBandwidth : 0) +
            inset
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'rect',
            key,
            x: Math.min(baselinePosition, valuePosition),
            y,
            width: Math.abs(baselinePosition - valuePosition),
            height: Math.max(0, groupBandwidth - inset * 2),
            radius: options.radius,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
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
            x: valuePosition,
            y:
              center -
              totalBandwidth / 2 +
              (layout === 'grouped' ? groupIndex + 0.5 : 0.5) * groupBandwidth,
            color: resolvedColor,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__bar ts-chart__bar-x',
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

function orderedGroups(values: readonly (ChartKey | null | undefined)[]) {
  const groups = new Map<string, number>()
  for (const value of values) {
    const key = valueKey(value ?? null)
    if (!groups.has(key)) groups.set(key, groups.size)
  }
  if (!groups.size) groups.set(valueKey(null), 0)
  return groups
}

function inferBandwidth(
  scale: ResolvedScale,
  values: readonly unknown[],
  span: number,
  count: number,
): number {
  const positions = [
    ...new Set(
      values
        .filter(isChartValue)
        .map(scale.map)
        .filter((value) => Number.isFinite(value)),
    ),
  ].sort((a, b) => a - b)
  let minimum = Infinity
  for (let index = 1; index < positions.length; index += 1) {
    minimum = Math.min(minimum, positions[index] - positions[index - 1])
  }
  return Number.isFinite(minimum)
    ? minimum * 0.8
    : Math.min(48, (span / Math.max(2, count + 1)) * 0.8)
}

function numericChannelValues<TDatum>(
  data: readonly TDatum[],
  channel: number | Channel<TDatum, number | null | undefined> | undefined,
  fallback: (
    datum: TDatum,
    index: number,
    data: readonly TDatum[],
  ) => number | null | undefined,
) {
  return typeof channel === 'number'
    ? data.map(() => channel)
    : channelValues(data, channel, fallback)
}
