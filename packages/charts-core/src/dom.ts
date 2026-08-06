import { mountChartRenderer } from './renderer'
import { createChartRuntime } from './runtime'
import { createSvgChartRenderer } from './svg-surface'
import { renderChartSvg } from './svg'
import type {
  ChartHost,
  ChartHostOptions,
  ChartRendererHostOptions,
} from './dom-types'
import type { ChartRuntime, ChartSvgRenderer, ChartValue } from './types'

export function mountChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartHostOptions<TDatum, TXValue, TYValue>,
  runtime: ChartRuntime<TDatum, TXValue, TYValue> = createChartRuntime<
    TDatum,
    TXValue,
    TYValue
  >(),
): ChartHost<TDatum, TXValue, TYValue> {
  let renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue> =
    initialOptions.renderSvg ?? renderChartSvg
  let renderer = createSvgChartRenderer(renderSvg)

  const rendererOptions = (
    options: ChartHostOptions<TDatum, TXValue, TYValue>,
  ): ChartRendererHostOptions<TDatum, TXValue, TYValue> => {
    const nextRenderSvg = options.renderSvg ?? renderChartSvg
    if (nextRenderSvg !== renderSvg) {
      renderSvg = nextRenderSvg
      renderer = createSvgChartRenderer(renderSvg)
    }
    const { renderSvg: _renderSvg, onRender, ...common } = options
    return {
      ...common,
      renderer,
      onRender: onRender
        ? ({ container: hostContainer, scene, surface, interaction }) => {
            const svg = surface.element
            const SvgElement =
              container.ownerDocument.defaultView?.SVGSVGElement
            if (!SvgElement || !(svg instanceof SvgElement)) {
              throw new TypeError('Expected the SVG chart surface.')
            }
            onRender({ container: hostContainer, scene, svg, interaction })
          }
        : undefined,
    }
  }

  const host = mountChartRenderer(
    container,
    rendererOptions(initialOptions),
    runtime,
  )

  return {
    interaction: host.interaction,
    update(options) {
      host.update(rendererOptions(options))
    },
    getScene: host.getScene,
    destroy: host.destroy,
  }
}
