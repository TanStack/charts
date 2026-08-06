import { createChartScene, defaultChartTheme } from './scene'
import type {
  DynamicChartDefinition,
  ChartDefinition,
  ChartLayoutOptions,
  ChartRuntime,
  ChartScene,
  ChartSize,
  ChartValue,
} from './types'

export function createChartRuntime<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(): ChartRuntime<TDatum, TXValue, TYValue> {
  return {
    render<TRenderXValue extends TXValue, TRenderYValue extends TYValue>(
      definition: ChartDefinition<TDatum, TRenderXValue, TRenderYValue>,
      size: ChartSize,
      layout?: ChartLayoutOptions,
    ): ChartScene<TDatum, TRenderXValue, TRenderYValue> {
      if (!isDynamicChartDefinition(definition)) {
        return createChartScene(definition, size, layout)
      }

      const spec = definition.chart({
        width: size.width,
        height: size.height,
        theme: defaultChartTheme,
      })
      const { chart: _chart, ...options } = definition

      return createChartScene(
        { ...spec, ...options },
        size,
        layout,
      ) as ChartScene<TDatum, TRenderXValue, TRenderYValue>
    },
    destroy() {},
  }
}

export function isDynamicChartDefinition<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
): definition is DynamicChartDefinition<TDatum, TXValue, TYValue> {
  return 'chart' in definition && typeof definition.chart === 'function'
}
