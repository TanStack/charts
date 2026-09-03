import { createChartScene, defaultChartTheme } from './scene'
import type {
  ResponsiveChartDefinition,
  ChartDefinition,
  ChartDefinitionForTooltipHost,
  ChartLayoutOptions,
  ChartRuntime,
  ChartRuntimeOptions,
  ChartScene,
  ChartSize,
  ChartValue,
} from './types'

export function createChartRuntime<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(options: ChartRuntimeOptions = {}): ChartRuntime<TDatum, TXValue, TYValue> {
  const platformTheme = {
    ...defaultChartTheme,
    ...options.defaultTheme,
    palette: options.defaultTheme?.palette ?? defaultChartTheme.palette,
  }
  return {
    render<TRenderXValue extends TXValue, TRenderYValue extends TYValue>(
      definition: ChartDefinition<TDatum, TRenderXValue, TRenderYValue>,
      size: ChartSize,
      layout?: ChartLayoutOptions,
    ): ChartScene<TDatum, TRenderXValue, TRenderYValue> {
      if (!isResponsiveChartDefinition(definition)) {
        return createChartScene(definition, size, {
          ...layout,
          defaultTheme: platformTheme,
        })
      }

      const { chart, ...options } = definition
      const spec = chart({
        width: size.width,
        height: size.height,
        defaultTheme: platformTheme,
      })

      return createChartScene({ ...spec, ...options }, size, {
        ...layout,
        defaultTheme: platformTheme,
      }) as ChartScene<TDatum, TRenderXValue, TRenderYValue>
    },
    destroy() {},
  }
}

export function isResponsiveChartDefinition<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
  TTooltipHost extends string,
>(
  definition: ChartDefinitionForTooltipHost<
    TDatum,
    TXValue,
    TYValue,
    TTooltipHost
  >,
): definition is Extract<
  ChartDefinitionForTooltipHost<TDatum, TXValue, TYValue, TTooltipHost>,
  ResponsiveChartDefinition<TDatum, TXValue, TYValue, TTooltipHost>
> {
  return 'chart' in definition && typeof definition.chart === 'function'
}
