import * as React from 'react'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartAnimationOptions,
  ChartFocusMode,
  ChartPoint,
  ChartRenderContext,
  ChartRendererRenderContext,
  ChartSpatialIndexFactory,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartTooltipOptions,
  ChartValue,
  DynamicChartDefinition,
  StaticChartDefinition,
} from '@tanstack/charts'
import {
  RendererChartImplementation,
  type RendererChartProps,
} from './RendererChart'

export interface ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  className?: string
  style?: React.CSSProperties
  maxFocusDistance?: number
  focus?: ChartFocusMode<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tabIndex?: number
  idPrefix?: string
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
}

export type StaticChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

export type ChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticChartProps<TDatum, TXValue, TYValue>
  | DynamicChartProps<TDatum, TInput, TXValue, TYValue>

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): React.JSX.Element
export function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>): React.JSX.Element
export function Chart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TInput, TXValue, TYValue>) {
  const renderSvg = props.renderSvg ?? renderChartSvg
  const renderer = React.useMemo(
    () => createSvgChartRenderer<TDatum, TXValue, TYValue>(renderSvg),
    [renderSvg],
  )
  const onRender = React.useMemo(() => {
    if (!props.onRender) return undefined
    return (context: ChartRendererRenderContext<TDatum, TXValue, TYValue>) => {
      const svg = context.surface.element
      const SvgElement =
        context.container.ownerDocument.defaultView?.SVGSVGElement
      if (!SvgElement || !(svg instanceof SvgElement)) {
        throw new TypeError('Expected the SVG chart surface.')
      }
      props.onRender?.({
        container: context.container,
        scene: context.scene,
        svg,
      })
    }
  }, [props.onRender])
  const rendererProps: RendererChartProps<TDatum, TInput, TXValue, TYValue> = {
    ...props,
    renderer,
    onRender,
  }

  return <RendererChartImplementation {...rendererProps} />
}
