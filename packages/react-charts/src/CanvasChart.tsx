import * as React from 'react'
import { canvasChartRenderer } from '@tanstack/charts/canvas'
import type {
  ChartValue,
  DynamicChartDefinition,
  StaticChartDefinition,
} from '@tanstack/charts'
import {
  RendererChartImplementation,
  type RendererChartCommonProps,
} from './RendererChart'

export type CanvasChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = Omit<RendererChartCommonProps<TDatum, TXValue, TYValue>, 'renderer'>

export type StaticCanvasChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = CanvasChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

export type DynamicCanvasChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = CanvasChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

export type CanvasChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticCanvasChartProps<TDatum, TXValue, TYValue>
  | DynamicCanvasChartProps<TDatum, TInput, TXValue, TYValue>

export function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticCanvasChartProps<TDatum, TXValue, TYValue>): React.JSX.Element
export function CanvasChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  props: DynamicCanvasChartProps<TDatum, TInput, TXValue, TYValue>,
): React.JSX.Element
export function CanvasChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TInput, TXValue, TYValue>) {
  return (
    <RendererChartImplementation {...props} renderer={canvasChartRenderer} />
  )
}
