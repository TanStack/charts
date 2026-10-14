import { createSvgChartRenderer } from './svg-surface'
import type { ChartSurface, UniversalChartRenderer } from './dom-types'
import type { ChartAnimationOptions, ChartValue } from './types'

export interface ChartMotionLiteOptions {
  /** Fade the whole chart on its first client paint. Adopted SVG does not fade. */
  initial?: boolean
  /** Duration in milliseconds for entrance and keyed SVG updates. Default: 240. */
  duration?: number
  easing?: Extract<ChartAnimationOptions['easing'], string>
  respectReducedMotion?: boolean
  /** Animate size changes. Default: false. */
  resize?: boolean
}

/** Whole-chart entrance and keyed SVG tweens, without the full motion engine. */
export function motionLite(
  options: ChartMotionLiteOptions = {},
): UniversalChartRenderer {
  const duration = options.duration ?? 240
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError('motionLite duration must be finite and non-negative.')
  }
  const animation: ChartAnimationOptions = {
    duration,
    easing: options.easing ?? 'ease-out',
  }
  const renderer: UniversalChartRenderer = {
    ...createSvgChartRenderer(),
    id: 'svg-motion-lite',
    mount<
      TDatum,
      TXValue extends ChartValue = ChartValue,
      TYValue extends ChartValue = ChartValue,
    >(
      container: HTMLElement,
      requestRender: (force?: boolean) => void,
    ): ChartSurface<TDatum, TXValue, TYValue> {
      const surface = createSvgChartRenderer<TDatum, TXValue, TYValue>().mount(
        container,
        requestRender,
      )
      const adopted = container.firstElementChild?.matches('svg.ts-chart')
      const view = container.ownerDocument.defaultView
      let initial = true
      let width: number | undefined
      let height: number | undefined
      let entrance: Animation | undefined
      return {
        renderer,
        supportsStateFocus: true,
        clientToScene: surface.clientToScene,
        paintFocus: surface.paintFocus,
        get element() {
          return surface.element
        },
        render(scene, renderOptions) {
          const reduced =
            options.respectReducedMotion !== false &&
            view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          const resized =
            !initial && (width !== scene.width || height !== scene.height)
          const animate =
            duration > 0 && !reduced && (!resized || options.resize)
          if (!animate) entrance?.cancel()
          surface.render(scene, {
            ...renderOptions,
            animation: !initial && animate ? animation : undefined,
          })
          if (initial && !adopted && options.initial !== false && animate) {
            entrance = surface.element.animate?.(
              [
                { opacity: 0 },
                {
                  opacity:
                    view?.getComputedStyle(surface.element).opacity || '1',
                },
              ],
              {
                duration,
                easing: options.easing ?? 'ease-out',
              },
            )
          }
          initial = false
          width = scene.width
          height = scene.height
        },
        destroy() {
          entrance?.cancel()
          surface.destroy()
        },
      }
    },
  }
  return renderer
}
