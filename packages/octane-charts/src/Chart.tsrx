import { useMemo } from 'octane'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type { ChartRendererRenderContext, ChartValue } from '@tanstack/charts'
import { RendererChart } from './RendererChart.tsrx'
import type { ChartProps } from './types'

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>) {
  const renderSvg = props.renderSvg ?? renderChartSvg
  const renderer = useMemo(
    () => createSvgChartRenderer<TDatum, TXValue, TYValue>(renderSvg),
    [renderSvg],
  )
  const onRender = props.onRender
    ? (context: ChartRendererRenderContext<TDatum, TXValue, TYValue>) => {
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
    : undefined

  return <RendererChart {...props} renderer={renderer} onRender={onRender} />
}
