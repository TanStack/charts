import { channelValues, createMark, isChartValue } from './mark'
import { valueKey } from './scales'
import type { Channel, ChartMark, ChartValue, SceneNode } from './types'

export interface RuleYOptions<TDatum> {
  id?: string
  y?: Channel<TDatum, ChartValue | null | undefined>
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
}

export interface RuleXOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
}

export function ruleY<TDatum>(
  source: Iterable<TDatum>,
  options: RuleYOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
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
  options: RuleXOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
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
