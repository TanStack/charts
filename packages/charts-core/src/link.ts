import {
  channelValues,
  createMark,
  isChartKey,
  isChartValue,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChannelOutput,
  ChartCurve,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  SceneNode,
  VisualChannel,
} from './types'

export interface LinkOptions<TDatum> {
  id?: string
  x1: Channel<TDatum, ChartValue | null | undefined>
  y1: Channel<TDatum, ChartValue | null | undefined>
  x2: Channel<TDatum, ChartValue | null | undefined>
  y2: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  curve?: ChartCurve
}

type LinkXOutput<TDatum, TOptions> =
  | ChannelOutput<TDatum, TOptions extends { x1: infer T } ? T : never, number>
  | ChannelOutput<TDatum, TOptions extends { x2: infer T } ? T : never, number>

type LinkYOutput<TDatum, TOptions> =
  | ChannelOutput<TDatum, TOptions extends { y1: infer T } ? T : never, number>
  | ChannelOutput<TDatum, TOptions extends { y2: infer T } ? T : never, number>

/**
 * Draws one independent segment per datum between two scaled positions.
 *
 * Link is the general segment primitive for intervals, error bars, networks,
 * slopegraphs, and annotations. Use lineY when consecutive rows form a path.
 */
export function link<
  TDatum,
  const TOptions extends LinkOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  LinkXOutput<TDatum, TOptions>,
  LinkYOutput<TDatum, TOptions>
>
export function link<TDatum>(
  source: Iterable<TDatum>,
  options: LinkOptions<NoInfer<TDatum>>,
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `link-${markIndex}`
    const x1Values = channelValues(data, options.x1, () => undefined)
    const y1Values = channelValues(data, options.y1, () => undefined)
    const x2Values = channelValues(data, options.x2, () => undefined)
    const y2Values = channelValues(data, options.y2, () => undefined)
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: [...x1Values, ...x2Values].filter(isChartValue),
        },
        y: {
          scale: 'y',
          values: [...y1Values, ...y2Values].filter(isChartValue),
        },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

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

          const x1 = scales.x.map(x1Value)
          const y1 = scales.y.map(y1Value)
          const x2 = scales.x.map(x2Value)
          const y2 = scales.y.map(y2Value)
          const group = zValues[datumIndex] ?? null
          const color = visualValue(
            options.stroke,
            datum,
            datumIndex,
            data,
            resolveColor(group),
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          const style = {
            fill: 'none',
            stroke: color,
            strokeOpacity: options.strokeOpacity,
            strokeWidth: options.strokeWidth ?? 1.5,
            strokeDasharray: options.strokeDasharray,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
          }

          nodes.push(
            options.curve
              ? {
                  kind: 'polyline',
                  key,
                  points: [
                    [x1, y1],
                    [x2, y2],
                  ],
                  path: options.curve.line([
                    [x1, y1],
                    [x2, y2],
                  ]),
                  style,
                }
              : {
                  kind: 'rule',
                  key,
                  x1,
                  y1,
                  x2,
                  y2,
                  style,
                },
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
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2,
            color,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__link',
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
