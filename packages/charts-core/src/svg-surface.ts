import { reconcileChartSvg } from './reconcile'
import { renderChartSvg } from './svg'
import { focusedNodeKeys } from './focus-layer'
import { resolveMarkStateScene, resolveMarkStateTransition } from './mark-state'
import { viewportTranslationChanged } from './scene-point-map'
import { svgClientToScene } from './svg-coordinates'
import type {
  ChartRenderer,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type {
  ChartFocusState,
  ChartMarkStateTransition,
  ChartPoint,
  ChartScene,
  SceneGroup,
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
      let renderOptions: ChartSurfaceRenderOptions | undefined
      let stateTransition: ChartMarkStateTransition | undefined
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
          const viewportMoved = Boolean(
            scene && viewportTranslationChanged(scene, nextScene),
          )
          cancelAnimation()
          cancelAnimation = reconcileChartSvg(
            container,
            renderSvg(nextScene, options),
            viewportMoved ? undefined : options.animation,
          )
          scene = nextScene
          renderOptions = options
          stateTransition = undefined
        },
        clientToScene(scene, clientX, clientY) {
          return svgClientToScene(svgElement(), scene, clientX, clientY)
        },
        paintFocus(focus, pointer) {
          if (!scene || !renderOptions) return
          const resolved = resolveMarkStateScene(scene, focus, pointer)
          const previousTransition = stateTransition
          if (resolved.scene !== scene || previousTransition) {
            cancelAnimation()
            cancelAnimation = reconcileChartSvg(
              container,
              renderSvg(resolved.scene, renderOptions),
              resolveMarkStateTransition(
                resolved.transition ?? previousTransition,
                container,
              ),
            )
          }
          stateTransition = focus
            ? (resolved.transition ?? previousTransition)
            : undefined
          paintSvgFocus(svgElement(), resolved.scene, focus)
          return resolved.scene
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
