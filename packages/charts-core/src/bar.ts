import { scaleBand } from 'd3-scale'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  visualValue,
} from './mark'
import { resolveScaleInput } from './scale-input'
import { valueKey } from './scales'
import { stackExtents, stackOptions } from './stack-internal'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  ResolvedScale,
  SceneNode,
  VisualChannel,
} from './types'
import type { GroupLayout } from './group'

export interface BarYOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  y1?: number | Channel<TDatum, number | null | undefined>
  y2?: number | Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  layout?: GroupLayout
  /** Pixels removed from both categorical edges after band layout. */
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
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  layout?: GroupLayout
  /** Pixels removed from both categorical edges after band layout. */
  inset?: number
  radius?: number
}

export function barY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function barY<
  TDatum,
  const TOptions extends BarYOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<TDatum, OptionChannelOutput<TDatum, TOptions, 'x', number>, number>
export function barY<TDatum>(
  source: Iterable<TDatum>,
  options: BarYOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `bar-y-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const rawYValues = numericChannelValues(
      data,
      options.y ?? options.y2,
      (datum) => (typeof datum === 'number' ? datum : undefined),
    )
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const seriesValues =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const explicitExtent = options.y1 !== undefined || options.y2 !== undefined
    const grouped = options.layout?.type === 'group'
    const stacked =
      !explicitExtent && !grouped
        ? stackYValues(xValues, rawYValues, seriesValues, options)
        : undefined
    const y1Values = explicitExtent
      ? numericChannelValues(data, options.y1, () => 0)
      : (stacked?.starts ?? data.map(() => 0))
    const y2Values = explicitExtent
      ? numericChannelValues(data, options.y2 ?? options.y, () => undefined)
      : grouped
        ? rawYValues
        : stacked!.ends
    const duplicatePositions = hasDuplicateValues(xValues)
    const groupValues =
      grouped || (!explicitExtent && duplicatePositions)
        ? seriesValues
        : zValues
    const keys = inferredKeyValues(data, options.key, {
      groups: groupValues,
      candidates: [xValues],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      seriesFromColor:
        options.z === undefined &&
        options.color !== undefined &&
        (grouped || duplicatePositions),
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: {
          scale: 'y',
          values: [
            ...y2Values.filter(isFiniteNumber),
            ...y1Values.filter(isFiniteNumber),
          ],
          includeZero: options.y1 === undefined,
        },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, color: resolveColor }) => {
        const totalBandwidth =
          scales.x.bandwidth ||
          inferBandwidth(scales.x, xValues, chart.width, data.length)
        const groupScale = resolveGroupScale(
          options.layout,
          groupValues,
          totalBandwidth,
        )
        const groupBandwidth = groupScale?.bandwidth ?? totalBandwidth
        const inset = Math.max(0, options.inset ?? 0)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = rawYValues[datumIndex]
          const y1Value = y1Values[datumIndex]
          const y2Value = y2Values[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isFiniteNumber(yValue) ||
            !isFiniteNumber(y1Value) ||
            !isFiniteNumber(y2Value)
          )
            return
          const group = groupValues[datumIndex] ?? null
          const groupOffset = groupScale?.map(group) ?? 0
          const resolvedColor = resolveColor(colorValues[datumIndex])
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolvedColor,
          )
          const center = scales.x.map(xValue)
          const baselinePosition = scales.y.map(y1Value)
          const valuePosition = scales.y.map(y2Value)
          const x = center - totalBandwidth / 2 + groupOffset + inset
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
            y1Value,
            y2Value,
            yInterval: 'difference',
            x: center - totalBandwidth / 2 + groupOffset + groupBandwidth / 2,
            y: valuePosition,
            color: fill,
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
): ChartMark<TDatum, number, number>
export function barX<
  TDatum,
  const TOptions extends BarXOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<TDatum, number, OptionChannelOutput<TDatum, TOptions, 'y', number>>
export function barX<TDatum>(
  source: Iterable<TDatum>,
  options: BarXOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `bar-x-${markIndex}`
    const rawXValues = numericChannelValues(
      data,
      options.x ?? options.x2,
      (datum) => (typeof datum === 'number' ? datum : undefined),
    )
    const yValues = channelValues(data, options.y, (_datum, index) => index)
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const seriesValues =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const explicitExtent = options.x1 !== undefined || options.x2 !== undefined
    const grouped = options.layout?.type === 'group'
    const stacked =
      !explicitExtent && !grouped
        ? stackXValues(yValues, rawXValues, seriesValues, options)
        : undefined
    const x1Values = explicitExtent
      ? numericChannelValues(data, options.x1, () => 0)
      : (stacked?.starts ?? data.map(() => 0))
    const x2Values = explicitExtent
      ? numericChannelValues(data, options.x2 ?? options.x, () => undefined)
      : grouped
        ? rawXValues
        : stacked!.ends
    const duplicatePositions = hasDuplicateValues(yValues)
    const groupValues =
      grouped || (!explicitExtent && duplicatePositions)
        ? seriesValues
        : zValues
    const keys = inferredKeyValues(data, options.key, {
      groups: groupValues,
      candidates: [yValues],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      seriesFromColor:
        options.z === undefined &&
        options.color !== undefined &&
        (grouped || duplicatePositions),
      channels: {
        x: {
          scale: 'x',
          values: [
            ...x2Values.filter(isFiniteNumber),
            ...x1Values.filter(isFiniteNumber),
          ],
          includeZero: options.x1 === undefined,
        },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, color: resolveColor }) => {
        const totalBandwidth =
          scales.y.bandwidth ||
          inferBandwidth(scales.y, yValues, chart.height, data.length)
        const groupScale = resolveGroupScale(
          options.layout,
          groupValues,
          totalBandwidth,
        )
        const groupBandwidth = groupScale?.bandwidth ?? totalBandwidth
        const inset = Math.max(0, options.inset ?? 0)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = rawXValues[datumIndex]
          const x1Value = x1Values[datumIndex]
          const x2Value = x2Values[datumIndex]
          const yValue = yValues[datumIndex]
          if (
            !isFiniteNumber(xValue) ||
            !isFiniteNumber(x1Value) ||
            !isFiniteNumber(x2Value) ||
            !isChartValue(yValue)
          )
            return
          const group = groupValues[datumIndex] ?? null
          const groupOffset = groupScale?.map(group) ?? 0
          const resolvedColor = resolveColor(colorValues[datumIndex])
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolvedColor,
          )
          const baselinePosition = scales.x.map(x1Value)
          const valuePosition = scales.x.map(x2Value)
          const center = scales.y.map(yValue)
          const y = center - totalBandwidth / 2 + groupOffset + inset
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
            x1Value,
            x2Value,
            xInterval: 'difference',
            x: valuePosition,
            y: center - totalBandwidth / 2 + groupOffset + groupBandwidth / 2,
            color: fill,
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

function resolveGroupScale(
  source: GroupLayout | undefined,
  values: readonly unknown[],
  bandwidth: number,
) {
  if (!source) return undefined
  const scale = resolveScaleInput(
    source.scale ??
      (() =>
        scaleBand<ChartKey>().padding(
          Number.isFinite(source.padding) ? Math.max(0, source.padding!) : 0.1,
        )),
    { values },
  )
  scale.range([0, bandwidth])
  const groupBandwidth = scale.bandwidth?.()
  if (groupBandwidth === undefined) {
    throw new TypeError('A grouped bar layout requires a D3 band scale')
  }
  return {
    bandwidth: groupBandwidth,
    map(value: ChartKey | null) {
      if (value === null) {
        throw new TypeError(
          'A grouped bar requires an explicit z channel or a discrete color channel',
        )
      }
      const position = scale(value)
      if (position === undefined || !Number.isFinite(position)) {
        throw new TypeError(
          `Bar group value "${String(value)}" is outside the group layout scale domain`,
        )
      }
      return position
    },
  }
}

function stackYValues(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  options: object,
) {
  const input = positions.flatMap((position, index) => {
    const value = values[index]
    if (!isChartValue(position) || !isFiniteNumber(value)) return []
    return [
      {
        index,
        position,
        value,
        series: isChartKey(series[index]) ? series[index] : index,
      },
    ]
  })
  const extents = stackExtents(input, stackOptions(options))
  const starts: (number | undefined)[] = Array.from(
    { length: positions.length },
    () => undefined,
  )
  const ends: (number | undefined)[] = Array.from(
    { length: positions.length },
    () => undefined,
  )
  for (const [index, extent] of extents) {
    starts[index] = extent.start
    ends[index] = extent.end
  }
  return { starts, ends }
}

function stackXValues(
  positions: readonly unknown[],
  values: readonly unknown[],
  series: readonly unknown[],
  options: object,
) {
  return stackYValues(positions, values, series, options)
}

function hasDuplicateValues(values: readonly unknown[]) {
  const seen = new Set<string>()
  for (const value of values) {
    if (!isChartValue(value)) continue
    const identity = valueKey(value)
    if (seen.has(identity)) return true
    seen.add(identity)
  }
  return false
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
