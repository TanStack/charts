import {
  channelValues,
  compositeKeyValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  markStates,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartTextStateStyle,
  MarkRenderContext,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  SceneLabel,
  SceneNode,
  VisualChannel,
} from './types'

export type TextAnchor = 'start' | 'middle' | 'end'

export interface TextOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  text?: Channel<TDatum, string | number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fontSize?: number
  fontWeight?: number
  anchor?: VisualChannel<TDatum, TextAnchor>
  rotate?: VisualChannel<TDatum, number>
  dx?: VisualChannel<TDatum, number>
  dy?: VisualChannel<TDatum, number>
  states?: readonly ChartMarkState<TDatum, ChartTextStateStyle<TDatum>>[]
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
): CartesianChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>,
  TOptions
>
export function text<TDatum>(
  source: Iterable<TDatum>,
  options: TextOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, TextOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark(
    ({ markIndex }) => {
      const id = options.id ?? `text-${markIndex}`
      const xValues = channelValues(
        data,
        options.x,
        (_datum, { index }) => index,
      )
      const yValues = channelValues(data, options.y, (datum) =>
        typeof datum === 'number' ? datum : undefined,
      )
      const textValues = channelValues(data, options.text, (datum) =>
        datum == null ? '' : String(datum),
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
      const anchors = data.map((datum, datumIndex) =>
        visualValue(options.anchor, datum, datumIndex, data, 'middle'),
      )
      const dxValues = data.map((datum, datumIndex) =>
        visualValue(options.dx, datum, datumIndex, data, 0),
      )
      const dyValues = data.map((datum, datumIndex) =>
        visualValue(options.dy, datum, datumIndex, data, 0),
      )
      const rotateValues =
        options.rotate === undefined
          ? undefined
          : data.map((datum, datumIndex) =>
              visualValue(options.rotate, datum, datumIndex, data, 0),
            )

      const resolveLabel = (context: MarkRenderContext, datumIndex: number) => {
        const xValue = xValues[datumIndex]
        const yValue = yValues[datumIndex]
        const textValue = textValues[datumIndex]
        if (
          !isChartValue(xValue) ||
          !isChartValue(yValue) ||
          textValue == null
        ) {
          return undefined
        }
        const group = zValues[datumIndex] ?? null
        const colorValue = colorValues[datumIndex] ?? null
        const node: SceneLabel = {
          kind: 'label',
          key: `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`,
          x: context.scales[xScale]!.map(xValue) + (dxValues[datumIndex] ?? 0),
          y: context.scales[yScale]!.map(yValue) + (dyValues[datumIndex] ?? 0),
          text: String(textValue),
          anchor: anchors[datumIndex],
          baseline: 'middle',
          rotate: rotateValues?.[datumIndex],
          fontSize: options.fontSize,
          fontWeight: options.fontWeight,
        }
        return { node, xValue, yValue, group, colorValue }
      }

      return {
        id,
        states: markStates(data, options.states),
        channels: {
          x: { scale: xScale, values: xValues.filter(isChartValue) },
          y: { scale: yScale, values: yValues.filter(isChartValue) },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        layoutLabels: (context) =>
          data.flatMap((_datum, datumIndex) => {
            const resolved = resolveLabel(context, datumIndex)
            return resolved ? [resolved.node] : []
          }),
        render: (context) => {
          const { theme, color: resolveColor } = context
          const nodes: SceneNode[] = []
          const points: ChartPoint<TDatum>[] = []
          data.forEach((datum, datumIndex) => {
            const resolved = resolveLabel(context, datumIndex)
            if (!resolved) return
            const { node, xValue, yValue, group, colorValue } = resolved
            const color = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              colorValue == null ? theme.foreground : resolveColor(colorValue),
            )
            nodes.push({
              ...node,
              style: { fill: color },
            })
            points.push({
              key: node.key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum,
              datumIndex,
              xValue,
              yValue,
              x: node.x,
              y: node.y,
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
    },
    options.motion,
    options.renderer,
  )
}
