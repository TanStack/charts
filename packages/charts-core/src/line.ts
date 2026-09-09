import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartCurve,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartLineStateStyle,
  ChartPoint,
  ChartValue,
  MarkCallOptions,
  MarkChannelOutput,
  MarkScaleBindings,
  SceneNode,
  SceneStyle,
  VisualChannel,
} from './types'

interface LineOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  lineCap?: SceneStyle['lineCap']
  lineJoin?: SceneStyle['lineJoin']
  points?: boolean
  curve?: ChartCurve
  states?: readonly ChartMarkState<TDatum, ChartLineStateStyle<TDatum>>[]
}

export interface LineYOptions<TDatum> extends LineOptions<TDatum> {
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
}

export interface LineXOptions<TDatum> extends LineOptions<TDatum> {
  x?: Channel<TDatum, number | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
}

type LineYCallOptions<
  TDatum,
  TXChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  LineYOptions<NoInfer<TDatum>>,
  {
    x?: TXChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

type LineXCallOptions<
  TDatum,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  LineXOptions<NoInfer<TDatum>>,
  {
    y?: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

interface LineRow<TDatum> {
  datum: TDatum
  datumIndex: number
  xValue: ChartValue | null | undefined
  yValue: ChartValue | null | undefined
  groupValue: ChartKey | null | undefined
  datumKey: ChartKey
}

interface LineChannels {
  xValues: readonly (ChartValue | null | undefined)[]
  yValues: readonly (ChartValue | null | undefined)[]
  isValidX: (value: unknown) => value is ChartValue
  isValidY: (value: unknown) => value is ChartValue
  keyValues: readonly (ChartValue | null | undefined)[]
  affinity: 'x' | 'y'
}

export function lineY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function lineY<
  TDatum,
  const TXChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    LineYCallOptions<TDatum, TXChannel, TXScaleId, TYScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  MarkChannelOutput<TDatum, TXChannel, number>,
  number,
  MarkChannelOutput<TDatum, TXChannel, number>,
  number,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function lineY<TDatum>(
  source: Iterable<TDatum>,
  options: LineYOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<
  TDatum,
  ChartValue,
  ChartValue,
  ChartValue,
  ChartValue,
  LineYOptions<TDatum>
> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createLineMark(data, options, 'line', () => {
    const xValues = channelValues(data, options.x, (_datum, { index }) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )

    return {
      xValues,
      yValues,
      isValidX: isChartValue,
      isValidY: isFiniteNumber,
      keyValues: xValues,
      affinity: 'x',
    }
  })
}

export function lineX<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function lineX<
  TDatum,
  const TYChannel extends
    Channel<NoInfer<TDatum>, ChartValue | null | undefined> | undefined = never,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    LineXCallOptions<TDatum, TYChannel, TXScaleId, TYScaleId> | undefined,
): CartesianChartMark<
  TDatum,
  number,
  MarkChannelOutput<TDatum, TYChannel, number>,
  number,
  MarkChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function lineX<TDatum>(
  source: Iterable<TDatum>,
  options: LineXOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<
  TDatum,
  ChartValue,
  ChartValue,
  ChartValue,
  ChartValue,
  LineXOptions<TDatum>
> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createLineMark(data, options, 'line-x', () => {
    const xValues = channelValues(data, options.x, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const yValues = channelValues(data, options.y, (_datum, { index }) => index)

    return {
      xValues,
      yValues,
      isValidX: isFiniteNumber,
      isValidY: isChartValue,
      keyValues: yValues,
      affinity: 'y',
    }
  })
}

function createLineMark<TDatum>(
  data: readonly TDatum[],
  options: LineOptions<TDatum>,
  idPrefix: string,
  channels: () => LineChannels,
): CartesianChartMark<
  TDatum,
  ChartValue,
  ChartValue,
  ChartValue,
  ChartValue,
  LineOptions<TDatum>
> {
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `${idPrefix}-${markIndex}`
      const { xValues, yValues, isValidX, isValidY, keyValues, affinity } =
        channels()
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const groupValues =
        options.z === undefined && options.color !== undefined
          ? colorValues
          : zValues
      const keys = inferredKeyValues(data, options.key, {
        groups: groupValues,
        candidates: [keyValues],
        markId: id,
        warningIdentity: options,
      })
      const rows = data.map((datum, datumIndex): LineRow<TDatum> => ({
        datum,
        datumIndex,
        xValue: xValues[datumIndex],
        yValue: yValues[datumIndex],
        groupValue: groupValues[datumIndex],
        datumKey: keys[datumIndex],
      }))

      return {
        id,
        states: markStates(data, options.states),
        seriesFromColor: options.z === undefined && options.color !== undefined,
        channels: {
          x: {
            scale: xScale,
            values: xValues.filter(isValidX),
          },
          y: {
            scale: yScale,
            values: yValues.filter(isValidY),
          },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, color: resolveColor }) => {
          const groups = groupRows(rows)
          const nodes: SceneNode[] = []

          for (const [groupKey, groupRows] of groups) {
            const firstRow = groupRows[0]
            if (!firstRow) continue
            const color = visualValue(
              options.stroke,
              firstRow.datum,
              firstRow.datumIndex,
              data,
              resolveColor(colorValues[firstRow.datumIndex] ?? null),
            )
            const children: SceneNode[] = []
            let segment: (readonly [number, number])[] = []
            let segmentPoints: ChartPoint<TDatum>[] = []
            let segmentIndex = 0

            const flushSegment = () => {
              if (!segment.length) return
              children.push({
                kind: 'polyline',
                key: `${id}:${groupKey}:segment:${segmentIndex}`,
                points: segment,
                path: options.curve?.line(segment),
                interaction: {
                  points: segmentPoints,
                  affinity,
                },
                style: {
                  fill: 'none',
                  stroke: color,
                  strokeOpacity: options.strokeOpacity,
                  strokeWidth: options.strokeWidth ?? 2.25,
                  strokeDasharray: options.strokeDasharray,
                  lineCap: options.lineCap || 'round',
                  lineJoin: options.lineJoin || 'round',
                },
              })
              segment = []
              segmentPoints = []
              segmentIndex += 1
            }

            for (const row of groupRows) {
              if (!isValidX(row.xValue) || !isValidY(row.yValue)) {
                flushSegment()
                continue
              }

              const x = scales[xScale]!.map(row.xValue)
              const y = scales[yScale]!.map(row.yValue)
              const point: ChartPoint<TDatum> = {
                key: `${id}:${groupKey}:${valueKey(row.datumKey)}`,
                markId: id,
                group: row.groupValue ?? null,
                groupLabel:
                  row.groupValue == null ? id : String(row.groupValue),
                datum: row.datum,
                datumIndex: row.datumIndex,
                xValue: row.xValue,
                yValue: row.yValue,
                x,
                y,
                color,
              }
              segmentPoints.push(point)
              segment.push([x, y])

              if (options.points) {
                children.push({
                  kind: 'dot',
                  key: `${point.key}:dot`,
                  x,
                  y,
                  radius: 2.5,
                  pointOwner: point,
                  style: { fill: color },
                })
              }
            }

            flushSegment()
            nodes.push({
              kind: 'group',
              key: `${id}:${groupKey}`,
              className: 'ts-chart__line',
              ariaHidden: true,
              children,
            })
          }

          return { nodes }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function groupRows<TDatum>(
  rows: readonly LineRow<TDatum>[],
): Map<string, LineRow<TDatum>[]> {
  const groups = new Map<string, LineRow<TDatum>[]>()
  for (const row of rows) {
    const key = valueKey(row.groupValue ?? null)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return groups
}
