import { reconcileChartSvg } from './reconcile'
import { renderChartSvg } from './svg'
import { focusedNodeKeys } from './focus-layer'
import type {
  ChartFocusState,
  ChartPoint,
  ChartRenderer,
  ChartScene,
  SceneGroup,
  ChartSurface,
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
      let scene: ChartScene<TDatum, TXValue, TYValue> | undefined
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
        render(nextScene, options) {
          cancelAnimation()
          cancelAnimation = reconcileChartSvg(
            container,
            renderSvg(nextScene, options),
            options.animation,
          )
          scene = nextScene
        },
        clientToScene(scene, clientX, clientY) {
          return clientToScene(svgElement(), scene, clientX, clientY)
        },
        paintFocus(focus) {
          if (!scene) return
          paintSvgFocus(svgElement(), scene, focus)
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

function paintSvgFocus(
  svg: SVGSVGElement,
  scene: ChartScene,
  focus: ChartFocusState | null,
): void {
  const sceneLayers = collectFocusLayers(scene.nodes)
  const elements = svg.querySelectorAll<SVGGElement>('[data-ts-focus-layer]')
  elements.forEach((element, index) => {
    const layer = sceneLayers[index]
    const visible = layer ? focusedNodeKeys(layer, focus) : new Set<string>()
    element.setAttribute(
      'visibility',
      focus && visible.size ? 'visible' : 'hidden',
    )
    element.querySelectorAll<SVGElement>('[data-ts-key]').forEach((child) => {
      const key = child.dataset.tsKey
      child.setAttribute(
        'visibility',
        key && visible.has(key) ? 'visible' : 'hidden',
      )
    })
  })
}

function collectFocusLayers(nodes: ChartScene['nodes']): SceneGroup[] {
  const layers: SceneGroup[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.focus) {
      layers.push(node)
    } else {
      layers.push(...collectFocusLayers(node.children))
    }
  }
  return layers
}
