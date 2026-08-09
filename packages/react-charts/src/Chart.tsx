import * as React from 'react'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartPoint,
  ChartRenderContext,
  ChartRendererRenderContext,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartTooltipBodyTarget,
  ChartValue,
  DomChartDefinition,
} from '@tanstack/charts'
import {
  RendererChartImplementation,
  type RendererChartImplementationProps,
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
  tabIndex?: number
  idPrefix?: string
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
}

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DomChartDefinition<TDatum, TXValue, TYValue>
}

export type ChartImplementationProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartProps<TDatum, TXValue, TYValue> & {
  onTooltipBodyChange?: (
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
  ) => void
}

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>) {
  return <ChartImplementation {...props} />
}

export function ChartImplementation<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartImplementationProps<TDatum, TXValue, TYValue>) {
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
        interaction: context.interaction,
      })
    }
  }, [props.onRender])
  const rendererProps: RendererChartImplementationProps<
    TDatum,
    TXValue,
    TYValue
  > = {
    ...props,
    renderer,
    onRender,
  }

  return <RendererChartImplementation {...rendererProps} />
}
