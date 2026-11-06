import { createLayeredChartRenderer } from './canvas'
import type { ChartRenderer } from './dom-types'
import type { ChartValue } from './types'

const compositions = new WeakMap<
  ChartRenderer<any, any, any>,
  ChartRenderer<any, any, any>
>()

/** Compose ordered mark surfaces, reusing the compositor for each default renderer. */
export function composeChartLayers<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  defaultRenderer: ChartRenderer<TDatum, TXValue, TYValue>,
): ChartRenderer<TDatum, TXValue, TYValue> {
  let composition = compositions.get(defaultRenderer)
  if (!composition) {
    composition = createLayeredChartRenderer(defaultRenderer)
    compositions.set(defaultRenderer, composition)
  }
  return composition
}
