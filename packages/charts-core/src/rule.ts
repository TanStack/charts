import { channelValues, createMark, isChartValue } from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChartMark,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
  WidenChartValue,
} from './types'

export interface RuleYOptions<TDatum> {
  id?: string
  y?: Channel<TDatum, ChartValue | null | undefined>
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
}

export interface RuleXOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  stroke?: string
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
    return {
      id,
      channels: { y: { scale: 'y', values: values.filter(isChartValue) } },
      render: ({ scales, chart, theme }) => ({
        nodes: [
          {
            kind: 'group',
            key: id,
            className: 'ts-chart__rule ts-chart__rule-y',
            ariaHidden: true,
            children: values.flatMap((value, index): SceneNode[] =>
              isChartValue(value)
                ? [
                    {
                      kind: 'rule',
                      key: `${id}:${valueKey(value)}:${index}`,
                      x1: chart.x,
                      x2: chart.x + chart.width,
                      y1: scales.y.map(value),
                      y2: scales.y.map(value),
                      style: {
                        stroke: options.stroke ?? theme.foreground,
                        strokeOpacity: options.strokeOpacity ?? 0.5,
                        strokeWidth: options.strokeWidth,
                        strokeDasharray: options.strokeDasharray,
                      },
                    },
                  ]
                : [],
            ),
          },
        ],
      }),
    }
  })
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
    return {
      id,
      channels: { x: { scale: 'x', values: values.filter(isChartValue) } },
      render: ({ scales, chart, theme }) => ({
        nodes: [
          {
            kind: 'group',
            key: id,
            className: 'ts-chart__rule ts-chart__rule-x',
            ariaHidden: true,
            children: values.flatMap((value, index): SceneNode[] =>
              isChartValue(value)
                ? [
                    {
                      kind: 'rule',
                      key: `${id}:${valueKey(value)}:${index}`,
                      x1: scales.x.map(value),
                      x2: scales.x.map(value),
                      y1: chart.y,
                      y2: chart.y + chart.height,
                      style: {
                        stroke: options.stroke ?? theme.foreground,
                        strokeOpacity: options.strokeOpacity ?? 0.5,
                        strokeWidth: options.strokeWidth,
                        strokeDasharray: options.strokeDasharray,
                      },
                    },
                  ]
                : [],
            ),
          },
        ],
      }),
    }
  })
}
