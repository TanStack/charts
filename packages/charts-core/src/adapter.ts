import { mountChart } from './dom'
import { createChartRuntime } from './runtime'
import { renderChartSvg } from './svg'
import { createSvgChartRenderer } from './svg-surface'
import { resolveChartAdapterLayout } from './adapter-shared'
import type { ChartAdapter } from './adapter-shared'
import type {
  ChartHost,
  ChartHostOptions,
  ChartRuntime,
  ChartValue,
} from './types'

export {
  resolveChartAdapterLayout,
  type ChartAdapter,
  type ChartAdapterLayout,
  type ChartAdapterLayoutOptions,
} from './adapter-shared'

export function createChartAdapter<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialOptions: ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
): ChartAdapter<
  ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
  TDatum,
  TXValue,
  TYValue
> {
  let runtime: ChartRuntime<TDatum, TInput, TXValue, TYValue> | undefined =
    createChartRuntime<TDatum, TInput, TXValue, TYValue>()
  let options = initialOptions
  let host: ChartHost<TDatum, TInput, TXValue, TYValue> | undefined
  const getRuntime = () =>
    (runtime ??= createChartRuntime<TDatum, TInput, TXValue, TYValue>())

  return {
    prerender() {
      const layout = resolveChartAdapterLayout(options)
      const scene = getRuntime().render(
        options.definition,
        options.input as TInput,
        {
          width: layout.initialWidth,
          height: layout.initialHeight,
        },
        { measureText: options.measureText },
      )
      const renderer = createSvgChartRenderer<TDatum, TXValue, TYValue>(
        options.renderSvg ?? renderChartSvg,
      )
      return renderer.prerender(scene, {
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
      host = mountChart(container, options, getRuntime())
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
