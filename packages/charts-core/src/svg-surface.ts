import { reconcileChartSvg, reconcileChartSvgFragment } from './reconcile'
import { renderChartSvg } from './svg'
import { focusedNodeKeys } from './focus-layer'
import { resolveFocusGuides } from './focus-presentation'
import { renderFocusGuideLayer } from './svg-renderer'
import { renderFocusGuideLayerWithRenderer } from './svg-focus-guide-serializer'
import {
  detachSvgFocusGuideLayers,
  ensureSvgFocusGuideLayer,
  removeSvgFocusGuideLayer,
  restoreSvgFocusGuideLayers,
} from './svg-focus-guide-layer'
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
  ChartCursorPresentation,
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
      let cancelFocusAnimation = () => {}
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
          cancelFocusAnimation()
          cancelFocusAnimation = () => {}
          const retainsFocusGuideLayers = Boolean(scene?.focusGuides?.length)
          const focusGuideLayers = retainsFocusGuideLayers
            ? detachSvgFocusGuideLayers(svgElement())
            : {}
          cancelAnimation = reconcileChartSvg(
            container,
            renderSvg(nextScene, options),
            viewportMoved ? undefined : options.animation,
          )
          if (retainsFocusGuideLayers) {
            restoreSvgFocusGuideLayers(
              svgElement(),
              focusGuideLayers,
              (placement) =>
                nextScene.focusGuides?.some(
                  (guide) => guide.placement === placement,
                ) === true,
            )
          }
          scene = nextScene
          renderOptions = options
          stateTransition = undefined
        },
        clientToScene(scene, clientX, clientY) {
          return svgClientToScene(svgElement(), scene, clientX, clientY)
        },
        paintFocus(focus, pointer, cursor) {
          if (!scene || !renderOptions) return
          const resolved = resolveMarkStateScene(scene, focus, pointer)
          const previousTransition = stateTransition
          if (resolved.scene !== scene || previousTransition) {
            cancelFocusAnimation()
            cancelFocusAnimation = () => {}
            const focusGuideLayers = detachSvgFocusGuideLayers(svgElement())
            cancelAnimation()
            cancelAnimation = reconcileChartSvg(
              container,
              renderSvg(resolved.scene, renderOptions),
              resolveMarkStateTransition(
                resolved.transition ?? previousTransition,
                container,
              ),
            )
            restoreSvgFocusGuideLayers(svgElement(), focusGuideLayers)
          }
          stateTransition = focus
            ? (resolved.transition ?? previousTransition)
            : undefined
          paintSvgFocus(svgElement(), resolved.scene, focus)
          cancelFocusAnimation()
          cancelFocusAnimation = paintSvgFocusGuides(
            svgElement(),
            resolved.scene,
            focus,
            pointer,
            cursor,
            renderOptions,
            renderSvg,
          )
          return resolved.scene
        },
        destroy() {
          cancelAnimation()
          cancelFocusAnimation()
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
  const elements = svg.querySelectorAll<SVGGElement>(
    '[data-ts-focus-layer]:not([data-ts-focus-guide-layer])',
  )
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

function paintSvgFocusGuides<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  svg: SVGSVGElement,
  scene: ChartScene<TDatum, TXValue, TYValue>,
  focus: ChartFocusState<TDatum, TXValue, TYValue> | null,
  pointer: Parameters<typeof resolveFocusGuides>[2],
  cursor: ChartCursorPresentation | null | undefined,
  renderOptions: ChartSurfaceRenderOptions,
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
) {
  const presentation = resolveFocusGuides(scene, focus, pointer, cursor)
  const cancellations: (() => void)[] = []
  for (const placement of ['under', 'over'] as const) {
    if (!scene.focusGuides?.some((guide) => guide.placement === placement)) {
      removeSvgFocusGuideLayer(svg, placement)
      continue
    }
    const layer = ensureSvgFocusGuideLayer(svg, placement)
    const nodes = presentation[placement]
    if (!nodes.length) {
      layer.setAttribute('visibility', 'hidden')
      continue
    }
    const markup =
      renderSvg === renderChartSvg
        ? renderFocusGuideLayer(nodes, placement, renderOptions.idPrefix ?? '')
        : renderFocusGuideLayerWithRenderer(
            svg,
            scene,
            nodes,
            placement,
            renderOptions,
            renderSvg,
          )
    cancellations.push(reconcileChartSvgFragment(layer, markup))
  }
  return () => cancellations.forEach((cancel) => cancel())
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
