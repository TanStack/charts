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
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'

export type TextAnchor = 'start' | 'middle' | 'end'

export interface TextOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  text?: Channel<TDatum, string | number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fontSize?: number
  fontWeight?: number
  anchor?: VisualChannel<TDatum, TextAnchor>
  rotate?: VisualChannel<TDatum, number>
  dx?: VisualChannel<TDatum, number>
  dy?: VisualChannel<TDatum, number>
}

export function text<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function text<
  TDatum,
  const TOptions extends TextOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
>
export function text<TDatum>(
  source: Iterable<TDatum>,
  options: TextOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `text-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const textValues = channelValues(data, options.text, (datum) =>
      datum == null ? '' : String(datum),
    )
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, theme, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          const textValue = textValues[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isChartValue(yValue) ||
            textValue == null
          )
            return
          const dx = visualValue(options.dx, datum, datumIndex, data, 0)
          const dy = visualValue(options.dy, datum, datumIndex, data, 0)
          const rotate =
            options.rotate === undefined
              ? undefined
              : visualValue(options.rotate, datum, datumIndex, data, 0)
          const x = scales.x.map(xValue) + dx
          const y = scales.y.map(yValue) + dy
          const group = zValues[datumIndex] ?? null
          const color = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            group == null ? theme.foreground : resolveColor(group),
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'label',
            key,
            x,
            y,
            text: String(textValue),
            anchor: visualValue(
              options.anchor,
              datum,
              datumIndex,
              data,
              'middle',
            ),
            baseline: 'middle',
            rotate,
            fontSize: options.fontSize,
            fontWeight: options.fontWeight,
            style: { fill: color },
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
              className: 'ts-chart__text',
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
