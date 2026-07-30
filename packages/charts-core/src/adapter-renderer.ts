import { mountChartRenderer } from './renderer'
import { createChartRuntime } from './runtime'
import { resolveChartAdapterLayout } from './adapter-shared'
import type { ChartAdapter } from './adapter-shared'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartValue,
} from './types'

export function createChartRendererAdapter<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue>,
): ChartAdapter<
  ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  TDatum,
  TXValue,
  TYValue
> {
  let runtime: ChartRuntime<TDatum, TXValue, TYValue> | undefined =
    createChartRuntime<TDatum, TXValue, TYValue>()
  let options = initialOptions
  let host: ChartRendererHost<TDatum, TXValue, TYValue> | undefined
  const getRuntime = () =>
    (runtime ??= createChartRuntime<TDatum, TXValue, TYValue>())

  return {
    prerender() {
      const layout = resolveChartAdapterLayout(options)
      const scene = getRuntime().render(
        options.definition,
        {
          width: layout.initialWidth,
          height: layout.initialHeight,
        },
        { measureText: options.measureText },
      )
      return options.renderer.prerender(scene, {
        ariaLabel: options.ariaLabel,
        ariaDescription: options.ariaDescription,
        className: options.className,
        tabIndex: options.keyboard === false ? -1 : (options.tabIndex ?? 0),
        idPrefix: options.idPrefix,
      })
    },
    mount(container) {
      if (host) {
        throw new Error('This chart adapter is already mounted.')
      }
      host = mountChartRenderer(container, options, getRuntime())
    },
    update(nextOptions) {
      options = nextOptions
      host?.update(nextOptions)
    },
    getScene() {
      return host?.getScene()
    },
    destroy() {
      if (host) {
        host.destroy()
        host = undefined
        runtime = undefined
      } else if (runtime) {
        runtime.destroy()
        runtime = undefined
      }
    },
  }
}
