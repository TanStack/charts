import { reconcileChartSvg, reconcileChartSvgFragment } from './reconcile'
import { renderChartSvg } from './svg'
import {
  focusedNodeKeys,
  resolveFocusScene,
  selectedFocusChildren,
} from './focus-layer'
import { isDefaultFocusLayer } from './default-focus-internal'
import { withSvgRenderChildren } from './svg-render-context-internal'
import { resolveFocusGuides } from './focus-presentation'
import { renderFocusGuideLayer } from './svg-renderer'
import {
  renderFocusGuideLayerWithRenderer,
  renderSvgFocusLayerWithRenderer,
} from './svg-focus-guide-serializer'
import {
  detachSvgFocusGuideLayers,
  ensureSvgFocusGuideLayer,
  removeSvgFocusGuideLayer,
  restoreSvgFocusGuideLayers,
} from './svg-focus-guide-layer'
import { resolveMarkStateScene } from './mark-state'
import { resolveMarkStateTransition } from './mark-state-transition'
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
    prerender: (scene, options) =>
      renderWithFocus(scene, options, null, renderSvg),
    mount(container) {
      let cancelAnimation = () => {}
      let cancelFocusAnimation = () => {}
      let scene: ChartScene<TDatum, TXValue, TYValue> | undefined
      let renderOptions: ChartSurfaceRenderOptions | undefined
      let stateTransition: ChartMarkStateTransition | undefined
      let markStatePainted = false
      let retargetedFocus = false
      let currentFocus: ChartFocusState | null = null
      let eagerFocus = false
      const svgElement = () => {
        const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!svg) {
          throw new Error(
            'The SVG renderer must produce an svg.ts-chart root element.',
          )
        }
        return svg
      }

      // Animated updates need the previous geometry of every possible target.
      // Keep that existing path once animation is requested, without making
      // static mounts pay for thousands of inactive circles.
      const prepareAnimatedFocus = () => {
        if (eagerFocus) return
        eagerFocus = true
        if (!scene || !renderOptions) return
        paintSvgFocus(
          svgElement(),
          scene,
          currentFocus,
          renderOptions,
          renderSvg,
          'all',
        )
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
          if (options.animation) prepareAnimatedFocus()
          cancelAnimation()
          cancelFocusAnimation()
          cancelFocusAnimation = () => {}
          const retainsFocusGuideLayers = Boolean(scene?.focusGuides?.length)
          const focusGuideLayers = retainsFocusGuideLayers
            ? detachSvgFocusGuideLayers(svgElement())
            : {}
          cancelAnimation = reconcileChartSvg(
            container,
            eagerFocus
              ? renderSvg(nextScene, options)
              : renderWithFocus(nextScene, options, currentFocus, renderSvg),
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
          markStatePainted = false
          retargetedFocus = false
        },
        clientToScene(scene, clientX, clientY) {
          return svgClientToScene(svgElement(), scene, clientX, clientY)
        },
        paintFocus(focus, pointer, cursor) {
          if (!scene || !renderOptions) return
          const state = resolveMarkStateScene(scene, focus, pointer)
          const resolved = resolveFocusScene(state.scene, focus)
          const previousTransition = stateTransition
          const transition = resolveMarkStateTransition(
            state.transition ?? previousTransition,
            container,
          )
          if (transition) prepareAnimatedFocus()
          if (
            resolved.scene !== scene ||
            markStatePainted ||
            retargetedFocus ||
            previousTransition
          ) {
            cancelFocusAnimation()
            cancelFocusAnimation = () => {}
            const focusGuideLayers = detachSvgFocusGuideLayers(svgElement())
            cancelAnimation()
            cancelAnimation = reconcileChartSvg(
              container,
              eagerFocus
                ? renderSvg(resolved.scene, renderOptions)
                : renderWithFocus(
                    resolved.scene,
                    renderOptions,
                    focus,
                    renderSvg,
                  ),
              transition,
            )
            restoreSvgFocusGuideLayers(svgElement(), focusGuideLayers)
          }
          retargetedFocus = resolved.retargeted
          markStatePainted = Boolean(focus && state.scene !== scene)
          stateTransition = focus
            ? (state.transition ?? previousTransition)
            : undefined
          currentFocus = focus
          paintSvgFocus(
            svgElement(),
            resolved.scene,
            focus,
            renderOptions,
            renderSvg,
            !eagerFocus,
          )
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

function paintSvgFocus<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  svg: SVGSVGElement,
  scene: ChartScene<TDatum, TXValue, TYValue>,
  focus: ChartFocusState | null,
  options: ChartSurfaceRenderOptions,
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
  deferDefaultFocus: boolean | 'all',
): void {
  const sceneLayers = collectFocusLayers(scene.nodes)
  const elements = svg.querySelectorAll<SVGGElement>(
    '[data-ts-focus-layer]:not([data-ts-focus-guide-layer])',
  )
  elements.forEach((element, index) => {
    const layer = sceneLayers[index]
    if (layer && deferDefaultFocus && isDefaultFocusLayer(layer)) {
      const children =
        deferDefaultFocus === 'all'
          ? layer.children
          : focus
            ? selectedFocusChildren(layer, focus)
            : []
      const existing = [...element.children].filter(
        (child) => child.localName === 'circle',
      )
      if (
        existing.length !== children.length ||
        existing.some(
          (child, index) =>
            child.getAttribute('data-ts-key') !== children[index]?.key,
        )
      ) {
        reconcileChartSvgFragment(
          element,
          renderSvgFocusLayerWithRenderer(
            svg,
            scene,
            { ...layer, children },
            options,
            renderSvg,
          ),
        )
      }
    }
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

function renderWithFocus<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  options: Parameters<ChartSvgRenderer<TDatum, TXValue, TYValue>>[1],
  focus: ChartFocusState | null,
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
): string {
  return withSvgRenderChildren(
    options,
    (layer) =>
      isDefaultFocusLayer(layer)
        ? focus
          ? selectedFocusChildren(layer, focus)
          : []
        : undefined,
    () => renderSvg(scene, options),
  )
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
