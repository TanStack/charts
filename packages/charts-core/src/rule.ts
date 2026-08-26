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
  CartesianChartMark,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartFocusAnchor,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
  WidenChartValue,
} from './types'

export interface RuleYOptions<TDatum> extends ChartMarkMotionOptions<never> {
  id?: string
  y?: Channel<TDatum, ChartValue | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  yScale?: string
}

export interface RuleXOptions<TDatum> extends ChartMarkMotionOptions<never> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  xScale?: string
}

type RuleFallback<TDatum> = [
  WidenChartValue<Extract<TDatum, ChartValue>>,
] extends [never]
  ? ChartValue
  : WidenChartValue<Extract<TDatum, ChartValue>>

export function ruleY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<never, never, RuleFallback<TDatum>>
export function ruleY<
  TDatum,
  const TOptions extends RuleYOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  never,
  never,
  OptionChannelOutput<TDatum, TOptions, 'y', RuleFallback<TDatum>>,
  never,
  OptionChannelOutput<TDatum, TOptions, 'y', RuleFallback<TDatum>>,
  TOptions
>
export function ruleY<TDatum>(
  source: Iterable<TDatum>,
  options: RuleYOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<never, any, any, any, any, RuleYOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const yScale = options.yScale ?? 'y'

  return createMark<never>(
    ({ markIndex }) => {
      const id = options.id ?? `rule-y-${markIndex}`
      const values = channelValues(data, options.y, (datum) =>
        isChartValue(datum) ? datum : undefined,
      )
      const colorValues = channelValues(data, options.color, () => null)
      return {
        id,
        channels: {
          y: { scale: yScale, values: values.filter(isChartValue) },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, chart, theme, color: resolveColor }) => {
          const children: SceneNode[] = []
          const focusAnchors: ChartFocusAnchor[] = []
          data.forEach((datum, index) => {
            const yValue = values[index]
            if (!isChartValue(yValue)) return
            const key = `${id}:${valueKey(yValue)}:${index}`
            children.push({
              kind: 'rule',
              key,
              x1: chart.x,
              x2: chart.x + chart.width,
              y1: scales[yScale]!.map(yValue),
              y2: scales[yScale]!.map(yValue),
              style: {
                stroke: visualValue(
                  options.stroke,
                  datum,
                  index,
                  data,
                  colorValues[index] == null
                    ? theme.foreground
                    : resolveColor(colorValues[index]),
                ),
                strokeOpacity: options.strokeOpacity ?? 0.5,
                strokeWidth: options.strokeWidth,
                strokeDasharray: options.strokeDasharray,
              },
            })
            focusAnchors.push({
              key,
              markId: id,
              group: isChartKey(colorValues[index]) ? colorValues[index] : null,
              datum,
              datumIndex: index,
              yValue,
            })
          })
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__rule ts-chart__rule-y',
                ariaHidden: true,
                children,
              },
            ],
            focusAnchors,
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

export function ruleX<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<never, RuleFallback<TDatum>, never>
export function ruleX<
  TDatum,
  const TOptions extends RuleXOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  never,
  OptionChannelOutput<TDatum, TOptions, 'x', RuleFallback<TDatum>>,
  never,
  OptionChannelOutput<TDatum, TOptions, 'x', RuleFallback<TDatum>>,
  never,
  TOptions
>
export function ruleX<TDatum>(
  source: Iterable<TDatum>,
  options: RuleXOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<never, any, any, any, any, RuleXOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'

  return createMark<never>(
    ({ markIndex }) => {
      const id = options.id ?? `rule-x-${markIndex}`
      const values = channelValues(data, options.x, (datum) =>
        isChartValue(datum) ? datum : undefined,
      )
      const colorValues = channelValues(data, options.color, () => null)
      return {
        id,
        channels: {
          x: { scale: xScale, values: values.filter(isChartValue) },
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ scales, chart, theme, color: resolveColor }) => {
          const children: SceneNode[] = []
          const focusAnchors: ChartFocusAnchor[] = []
          data.forEach((datum, index) => {
            const xValue = values[index]
            if (!isChartValue(xValue)) return
            const key = `${id}:${valueKey(xValue)}:${index}`
            children.push({
              kind: 'rule',
              key,
              x1: scales[xScale]!.map(xValue),
              x2: scales[xScale]!.map(xValue),
              y1: chart.y,
              y2: chart.y + chart.height,
              style: {
                stroke: visualValue(
                  options.stroke,
                  datum,
                  index,
                  data,
                  colorValues[index] == null
                    ? theme.foreground
                    : resolveColor(colorValues[index]),
                ),
                strokeOpacity: options.strokeOpacity ?? 0.5,
                strokeWidth: options.strokeWidth,
                strokeDasharray: options.strokeDasharray,
              },
            })
            focusAnchors.push({
              key,
              markId: id,
              group: isChartKey(colorValues[index]) ? colorValues[index] : null,
              datum,
              datumIndex: index,
              xValue,
            })
          })
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__rule ts-chart__rule-x',
                ariaHidden: true,
                children,
              },
            ],
            focusAnchors,
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}
