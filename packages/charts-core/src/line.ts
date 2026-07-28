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
  SceneNode,
  ChartCurve,
  VisualChannel,
  OptionChannelOutput,
} from './types'

export interface LineYOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  points?: boolean
  curve?: ChartCurve
}

interface LineRow<TDatum> {
  datum: TDatum
  datumIndex: number
  xValue: ChartValue | null | undefined
  yValue: number | null | undefined
  zValue: ChartKey | null | undefined
  datumKey: ChartKey
}

export function lineY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function lineY<
  TDatum,
  const TOptions extends LineYOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<TDatum, OptionChannelOutput<TDatum, TOptions, 'x', number>, number>
export function lineY<TDatum>(
  source: Iterable<TDatum>,
  options: LineYOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `line-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)
    const rows = data.map((datum, datumIndex): LineRow<TDatum> => ({
      datum,
      datumIndex,
      xValue: xValues[datumIndex],
      yValue: yValues[datumIndex],
      zValue: zValues[datumIndex],
      datumKey: keys[datumIndex],
    }))

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: xValues.filter(isChartValue),
        },
        y: {
          scale: 'y',
          values: yValues.filter(isFiniteNumber),
        },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, color: resolveColor }) => {
        const groups = groupRows(rows)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        for (const [groupKey, groupRows] of groups) {
          const firstRow = groupRows[0]
          if (!firstRow) continue
          const color = visualValue(
            options.stroke,
            firstRow.datum,
            firstRow.datumIndex,
            data,
            resolveColor(firstRow.zValue),
          )
          const children: SceneNode[] = []
          let segment: (readonly [number, number])[] = []
          let segmentIndex = 0

          const flushSegment = () => {
            if (!segment.length) return
            children.push({
              kind: 'polyline',
              key: `${id}:${groupKey}:segment:${segmentIndex}`,
              points: segment,
              path: options.curve?.line(segment),
              style: {
                fill: 'none',
                stroke: color,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth ?? 2.25,
                strokeDasharray: options.strokeDasharray,
                lineCap: 'round',
                lineJoin: 'round',
              },
            })
            segment = []
            segmentIndex += 1
          }

          for (const row of groupRows) {
            if (!isChartValue(row.xValue) || !isFiniteNumber(row.yValue)) {
              flushSegment()
              continue
            }

            const x = scales.x.map(row.xValue)
            const y = scales.y.map(row.yValue)
            const point: ChartPoint<TDatum> = {
              key: `${id}:${groupKey}:${valueKey(row.datumKey)}`,
              markId: id,
              group: row.zValue ?? null,
              groupLabel: row.zValue == null ? id : String(row.zValue),
              datum: row.datum,
              datumIndex: row.datumIndex,
              xValue: row.xValue,
              yValue: row.yValue,
              x,
              y,
              color,
            }
            points.push(point)
            segment.push([x, y])

            if (options.points) {
              children.push({
                kind: 'dot',
                key: `${point.key}:dot`,
                x,
                y,
                radius: 2.5,
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

        return { nodes, points }
      },
    }
  })
}

function groupRows<TDatum>(
  rows: readonly LineRow<TDatum>[],
): Map<string, LineRow<TDatum>[]> {
  const groups = new Map<string, LineRow<TDatum>[]>()
  for (const row of rows) {
    const key = valueKey(row.zValue ?? '')
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return groups
}
