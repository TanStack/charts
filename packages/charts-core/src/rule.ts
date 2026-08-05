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
  ChartMarkMotionOptions,
  ChartPoint,
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
}

export interface RuleXOptions<TDatum> extends ChartMarkMotionOptions<never> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
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
): ChartMark<
  never,
  never,
  OptionChannelOutput<TDatum, TOptions, 'y', RuleFallback<TDatum>>
>
export function ruleY<TDatum>(
  source: Iterable<TDatum>,
  options: RuleYOptions<NoInfer<TDatum>> = {},
): ChartMark<never, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark<never>(({ markIndex }) => {
    const id = options.id ?? `rule-y-${markIndex}`
    const values = channelValues(data, options.y, (datum) =>
      isChartValue(datum) ? datum : undefined,
    )
    const colorValues = channelValues(data, options.color, () => null)
    return {
      id,
      channels: {
        y: { scale: 'y', values: values.filter(isChartValue) },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, theme, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const focusPoints: ChartPoint[] = []

        data.forEach((datum, index) => {
          const value = values[index]
          if (!isChartValue(value)) return

          const y = scales.y.map(value)
          const color = visualValue(
            options.stroke,
            datum,
            index,
            data,
            colorValues[index] == null
              ? theme.foreground
              : resolveColor(colorValues[index]),
          )
          const key = `${id}:${valueKey(value)}:${index}`
          nodes.push({
            kind: 'rule',
            key,
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: y,
            y2: y,
            style: {
              stroke: color,
              strokeOpacity: options.strokeOpacity ?? 0.5,
              strokeWidth: options.strokeWidth,
              strokeDasharray: options.strokeDasharray,
            },
          })
          focusPoints.push({
            key,
            markId: id,
            group: null,
            groupLabel: id,
            datum,
            datumIndex: index,
            xValue: 0,
            yValue: value,
            x: chart.x + chart.width / 2,
            y,
            color,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__rule ts-chart__rule-y',
              ariaHidden: true,
              children: nodes,
            },
          ],
          focusPoints,
        }
      },
    }
  }, options.motion)
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
): ChartMark<
  never,
  OptionChannelOutput<TDatum, TOptions, 'x', RuleFallback<TDatum>>,
  never
>
export function ruleX<TDatum>(
  source: Iterable<TDatum>,
  options: RuleXOptions<NoInfer<TDatum>> = {},
): ChartMark<never, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark<never>(({ markIndex }) => {
    const id = options.id ?? `rule-x-${markIndex}`
    const values = channelValues(data, options.x, (datum) =>
      isChartValue(datum) ? datum : undefined,
    )
    const colorValues = channelValues(data, options.color, () => null)
    return {
      id,
      channels: {
        x: { scale: 'x', values: values.filter(isChartValue) },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, chart, theme, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const focusPoints: ChartPoint[] = []

        data.forEach((datum, index) => {
          const value = values[index]
          if (!isChartValue(value)) return

          const x = scales.x.map(value)
          const color = visualValue(
            options.stroke,
            datum,
            index,
            data,
            colorValues[index] == null
              ? theme.foreground
              : resolveColor(colorValues[index]),
          )
          const key = `${id}:${valueKey(value)}:${index}`
          nodes.push({
            kind: 'rule',
            key,
            x1: x,
            x2: x,
            y1: chart.y,
            y2: chart.y + chart.height,
            style: {
              stroke: color,
              strokeOpacity: options.strokeOpacity ?? 0.5,
              strokeWidth: options.strokeWidth,
              strokeDasharray: options.strokeDasharray,
            },
          })
          focusPoints.push({
            key,
            markId: id,
            group: null,
            groupLabel: id,
            datum,
            datumIndex: index,
            xValue: value,
            yValue: 0,
            x,
            y: chart.y + chart.height / 2,
            color,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__rule ts-chart__rule-x',
              ariaHidden: true,
              children: nodes,
            },
          ],
          focusPoints,
        }
      },
    }
  }, options.motion)
}
