import { mountChartRenderer } from './renderer'
import { createChartRuntime } from './runtime'
import { createSvgChartRenderer } from './svg-surface'
import { renderChartSvg } from './svg'
import type {
  ChartHost,
  ChartHostOptions,
  DynamicChartHostOptions,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartSvgRenderer,
  ChartValue,
} from './types'

export function mountChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
  runtime: ChartRuntime<TDatum, TInput, TXValue, TYValue> = createChartRuntime<
    TDatum,
    TInput,
    TXValue,
    TYValue
  >(),
): ChartHost<TDatum, TInput, TXValue, TYValue> {
  let renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue> =
    initialOptions.renderSvg ?? renderChartSvg
  let renderer = createSvgChartRenderer(renderSvg)

  const rendererOptions = (
    options: ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
  ): ChartRendererHostOptions<TDatum, TInput, TXValue, TYValue> => {
    const nextRenderSvg = options.renderSvg ?? renderChartSvg
    if (nextRenderSvg !== renderSvg) {
      renderSvg = nextRenderSvg
      renderer = createSvgChartRenderer(renderSvg)
    }
    if (isDynamicOptions(options)) {
      const { renderSvg: _renderSvg, onRender, ...common } = options
      return {
        ...common,
        renderer,
        onRender: onRender
          ? ({ container: hostContainer, scene, surface }) => {
              const svg = surface.element
              const SvgElement =
                container.ownerDocument.defaultView?.SVGSVGElement
              if (!SvgElement || !(svg instanceof SvgElement)) {
                throw new TypeError('Expected the SVG chart surface.')
              }
              onRender({ container: hostContainer, scene, svg })
            }
          : undefined,
      }
    }

    const { renderSvg: _renderSvg, onRender, ...common } = options
    return {
      ...common,
      renderer,
      onRender: onRender
        ? ({ container: hostContainer, scene, surface }) => {
            const svg = surface.element
            const SvgElement =
              container.ownerDocument.defaultView?.SVGSVGElement
            if (!SvgElement || !(svg instanceof SvgElement)) {
              throw new TypeError('Expected the SVG chart surface.')
            }
            onRender({ container: hostContainer, scene, svg })
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
    update(options) {
      host.update(rendererOptions(options))
    },
    getScene: host.getScene,
    destroy: host.destroy,
  }
}

function isDynamicOptions<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  options: ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
): options is DynamicChartHostOptions<TDatum, TInput, TXValue, TYValue> {
  return 'chart' in options.definition
}
