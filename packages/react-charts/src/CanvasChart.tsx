import * as React from 'react'
import { canvasChartRenderer } from '@tanstack/charts/canvas'
import type { ChartDefinition, ChartValue } from '@tanstack/charts'
import {
  RendererChartImplementation,
  type RendererChartCommonProps,
} from './RendererChart'

export type CanvasChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = Omit<RendererChartCommonProps<TDatum, TXValue, TYValue>, 'renderer'>

export type CanvasChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = CanvasChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}

export function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TXValue, TYValue>) {
  return (
    <RendererChartImplementation {...props} renderer={canvasChartRenderer} />
  )
}
