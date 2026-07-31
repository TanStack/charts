import { reconcileChartSvg } from './reconcile'
import { renderChartSvg } from './svg'
import type { ChartRenderer, ChartSurface } from './dom-types'
import type {
  ChartPoint,
  ChartScene,
  ChartSvgRenderer,
  ChartValue,
} from './types'

export function createSvgChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue> = renderChartSvg,
): ChartRenderer<TDatum, TXValue, TYValue> {
  const renderer: ChartRenderer<TDatum, TXValue, TYValue> = {
    id: 'svg',
    prerender: renderSvg,
    mount(container) {
      let cancelAnimation = () => {}
      const svgElement = () => {
        const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!svg) {
          throw new Error(
            'The SVG renderer must produce an svg.ts-chart root element.',
          )
        }
        return svg
      }

      const surface: ChartSurface<TDatum, TXValue, TYValue> = {
        renderer,
        get element() {
          return svgElement()
        },
        render(scene, options) {
          cancelAnimation()
          cancelAnimation = reconcileChartSvg(
            container,
            renderSvg(scene, options),
            options.animation,
          )
        },
        clientToScene(scene, clientX, clientY) {
          return clientToScene(svgElement(), scene, clientX, clientY)
        },
        paintFocus(point) {
          paintSvgFocus(svgElement(), point)
        },
        destroy() {
          cancelAnimation()
        },
      }

      return surface
    },
  }

  return renderer
}

export const svgChartRenderer = createSvgChartRenderer()

function clientToScene(
  element: SVGSVGElement,
  scene: ChartScene,
  clientX: number,
  clientY: number,
) {
  const bounds = element.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  return {
    x: ((clientX - bounds.left) / bounds.width) * scene.width,
    y: ((clientY - bounds.top) / bounds.height) * scene.height,
  }
}

function paintSvgFocus(svg: SVGSVGElement, point: ChartPoint | null): void {
  const focus = svg.querySelector<SVGCircleElement>('[data-ts-chart-focus]')
  if (!focus) return
  if (point) {
    focus.setAttribute('cx', String(point.x))
    focus.setAttribute('cy', String(point.y))
    focus.setAttribute('stroke', point.color)
    focus.setAttribute('visibility', 'visible')
  } else {
    focus.setAttribute('visibility', 'hidden')
  }
}
