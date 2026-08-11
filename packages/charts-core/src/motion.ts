import { focusedNodeKeys, resolveFocusScene } from './focus-layer'
import { resolveFocusGuides } from './focus-presentation'
import { resolveMarkStateScene } from './mark-state'
import { reconcileChartSvg, reconcileChartSvgFragment } from './reconcile'
import { chartSceneSource } from './scene-source'
import {
  sceneMotionNode,
  type SceneMotionMetadata,
  type SceneMotionNode,
  type SceneMotionPathGeometry,
} from './scene-motion-internal'
import { viewportTranslationChanged } from './scene-point-map'
import { createChartSpring } from './spring'
import { renderChartSvgWithResources } from './svg-resources'
import { svgClientToScene } from './svg-coordinates'
import { valueKey } from './scales'
import { resolveRollingPathPlan } from './motion-path'
import type {
  RollingPathPlan,
  RollingPathSnapshot,
  RollingPathTransform,
} from './motion-path'
import { renderFocusGuideLayer } from './svg-renderer'
import {
  detachSvgFocusGuideLayers,
  ensureSvgFocusGuideLayer,
  removeSvgFocusGuideLayer,
  restoreSvgFocusGuideLayers,
} from './svg-focus-guide-layer'
import type {
  ChartRenderer,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type {
  ChartFocusState,
  ChartCursorPresentation,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPath,
  ChartMotionPhase,
  ChartRollingPathMotion,
  ChartMotionRole,
  ChartMotionSpringTransition,
  ChartMotionTiming,
  ChartMotionTransition,
  ChartMotionTweenTransition,
  ChartMarkStateTransition,
  ChartPoint,
  ChartScene,
  ChartSvgRenderer,
  ChartTooltipPosition,
  ChartValue,
  InitializedMark,
  SceneGroup,
  SceneNode,
  StaticChartDefinition,
} from './types'
import type { ChartSpring } from './spring'

export type {
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPath,
  ChartMotionPhase,
  ChartRollingPathMotion,
  ChartMotionRole,
  ChartMotionSpringTransition,
  ChartMotionTiming,
  ChartMotionTransition,
  ChartMotionTweenTransition,
} from './types'

export interface ChartMotionOptions {
  /** Animate the first client render. Server-rendered SVG is always adopted. */
  initial?: boolean
  /** Default transition. Definition-local motion can refine or replace it. */
  transition?: ChartMotionTransition
  /** Snap when the user requests reduced motion. Defaults to true. */
  respectReducedMotion?: boolean
  /** Animate updates caused only by a chart resize. Defaults to false. */
  resize?: boolean
}

interface ChartSvgMotionContext<TDatum = unknown> {
  container: HTMLElement
  scene: ChartScene<TDatum>
  previousScene?: ChartScene<TDatum>
  presentationPoints?: readonly ChartPoint<TDatum>[]
  markup?: string
  phase: 'initial' | 'update'
  transition?: ChartMotionTransition
  markTransitions?: Readonly<Record<string, ChartMotionTransition>>
  setPresentationPoints?: (points: readonly ChartPoint<TDatum>[]) => void
}

interface ChartSvgMotionFragmentContext<TDatum = unknown> {
  container: HTMLElement
  root: SVGElement
  scene: ChartScene<TDatum>
  previousScene?: ChartScene<TDatum>
  markup: string
  transition?: ChartMotionTransition
}

interface ChartSvgMotionDriver<TDatum = unknown> {
  readonly id: string
  readonly initial: boolean
  readonly resize: boolean
  readonly respectReducedMotion: boolean
  animateSvg: (context: ChartSvgMotionContext<TDatum>) => () => void
  animateSvgFragment: (
    context: ChartSvgMotionFragmentContext<TDatum>,
  ) => () => void
}

interface MotionValueState {
  value: number
  velocity: number
}

interface MotionValueBinding {
  state: MotionValueState
  from: number
  to: number
  velocity: number
}

interface MotionTrack {
  delay: number
  transition: ResolvedTransition
  values: MotionValueBinding[]
  apply: (values: readonly number[]) => void
  finish: () => void
  cancel?: () => void
}

interface MotionAttribute {
  name: string
  skeleton: string
  from: number[]
  to: number[]
  target: string | null
}

interface MotionRuntime {
  elements: WeakMap<Element, Map<string, MotionValueState[]>>
  points: Map<string, MotionValueState[]>
}

interface ResolvedTweenTransition {
  type: 'tween'
  duration: number
  easing: (progress: number) => number
}

interface ResolvedSpringTransition {
  type: 'spring'
  spring: ChartSpring
}

type ResolvedTransition = ResolvedTweenTransition | ResolvedSpringTransition

interface ResolvedMotionOptions {
  transition: ResolvedTransition
}

interface SceneMotionDefinitions {
  default?: ChartMotionDefinition<any>
  marks?: Readonly<Record<string, ChartMotionDefinition<any>>>
  guides?: Readonly<Record<string, ChartMotionDefinition<any>>>
}

type SceneMotionSource = readonly [
  StaticChartDefinition,
  readonly InitializedMark[],
]

type ResolvedTiming = Pick<MotionTrack, 'delay' | 'transition'> & {
  path: ChartMotionPath
}
type TimingResolver = (context: ChartMotionContext) => ResolvedTiming

interface PlannedRollingPath {
  key: string
  outcome: RollingPathPlan
  points: readonly ChartPoint[]
  previousPoints: readonly ChartPoint[]
  timing: ResolvedTiming
}

interface RollingPathPlans {
  elements: ReadonlyMap<string, PlannedRollingPath>
  points: ReadonlyMap<string, PlannedRollingPath>
}

const defaultDuration = 1_100
const defaultStaggerRatio = 0.4
const defaultEasing = cubicBezier(0.85, 0, 0.15, 1)
const springSafetyLimit = 10_000
let clipId = 0

function createSvgMotionDriver<TDatum = unknown>(
  options: ChartMotionOptions = {},
): ChartSvgMotionDriver<TDatum> {
  const transition = resolveTransition(options.transition, defaultDuration)
  const resolved: ResolvedMotionOptions = {
    transition,
  }

  return createSvgMotionRuntime(resolved, {
    initial: options.initial ?? true,
    resize: options.resize ?? false,
    respectReducedMotion: options.respectReducedMotion ?? true,
  }) as ChartSvgMotionDriver<TDatum>
}

function createSvgMotionRuntime(
  options: ResolvedMotionOptions,
  policy: Pick<
    ChartSvgMotionDriver,
    'initial' | 'resize' | 'respectReducedMotion'
  >,
): ChartSvgMotionDriver {
  const runtimes = new WeakMap<HTMLElement, MotionRuntime>()
  return {
    id: 'svg-motion',
    ...policy,
    animateSvg(context) {
      let runtime = runtimes.get(context.container)
      if (!runtime) {
        runtime = {
          elements: new WeakMap(),
          points: new Map(),
        }
        runtimes.set(context.container, runtime)
      }
      const timing = createTimingResolver(
        options,
        context.scene,
        context.transition || context.markTransitions
          ? {
              ...(context.transition
                ? { default: { transition: context.transition } }
                : {}),
              ...(context.markTransitions
                ? {
                    marks: Object.fromEntries(
                      Object.entries(context.markTransitions).map(
                        ([markId, transition]) => [markId, { transition }],
                      ),
                    ),
                  }
                : {}),
            }
          : undefined,
      )
      if (context.phase === 'update' && context.markup) {
        return reconcileMotionSvg(context, options, timing, runtime)
      }
      const root =
        context.container.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!root) return () => {}
      const points = new Map(
        context.scene.points.map((point) => [point.key, point]),
      )
      const tracks = [
        ...createBarTracks(root, context.scene, points, timing, runtime),
        ...createLineTracks(root, context.scene, timing),
      ]
      const presentation = createPresentationTracks(
        root,
        context.scene,
        context.presentationPoints ?? [],
        timing,
        context.setPresentationPoints,
        'enter',
        runtime,
      )
      return runTracks(root, [...tracks, ...presentation.tracks], {
        publish: presentation.publish,
        finish: () => context.setPresentationPoints?.(context.scene.points),
      })
    },
    animateSvgFragment(context) {
      let runtime = runtimes.get(context.container)
      if (!runtime) {
        runtime = {
          elements: new WeakMap(),
          points: new Map(),
        }
        runtimes.set(context.container, runtime)
      }
      const nextRoot = parseSvgFragment(context.root, context.markup)
      if (
        !nextRoot ||
        context.root.namespaceURI !== nextRoot.namespaceURI ||
        context.root.localName !== nextRoot.localName
      ) {
        if (nextRoot) context.root.replaceWith(nextRoot)
        return () => {}
      }
      const tracks: MotionTrack[] = []
      reconcileMotionElement(context.root, nextRoot, tracks, {
        scene: context.scene,
        previousScene: context.previousScene,
        timingFor: createTimingResolver(
          options,
          context.scene,
          context.transition
            ? { default: { transition: context.transition } }
            : undefined,
        ),
        options,
        runtime,
        pathPlans: {
          elements: new Map(),
          points: new Map(),
        },
      })
      return runTracks(context.root, tracks)
    },
  }
}

function parseSvgFragment(current: SVGElement, markup: string) {
  const template = current.ownerDocument.createElement('template')
  template.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
  return template.content.firstElementChild?.firstElementChild ?? undefined
}

export function motion<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(options: ChartMotionOptions = {}): ChartRenderer<TDatum, TXValue, TYValue> {
  return createMotionSvgChartRenderer<TDatum, TXValue, TYValue>(
    createSvgMotionDriver(options),
    renderChartSvgWithResources,
  )
}

function createMotionSvgChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  motion: ChartSvgMotionDriver<TDatum>,
  renderSvg: ChartSvgRenderer<
    TDatum,
    TXValue,
    TYValue
  > = renderChartSvgWithResources,
): ChartRenderer<TDatum, TXValue, TYValue> {
  const renderer: ChartRenderer<TDatum, TXValue, TYValue> = {
    id: `svg:${motion.id}`,
    prerender: renderSvg,
    mount(container) {
      const adoptedRoot =
        container.firstElementChild?.matches('svg.ts-chart') ?? false
      let cancelAnimation = () => {}
      let cancelFocusAnimation = () => {}
      const visibleFocusGuides = new Set<'under' | 'over'>()
      let scene: ChartScene<TDatum, TXValue, TYValue> | undefined
      let presentationPoints:
        readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined
      const presentationListeners = new Set<
        (points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) => void
      >()
      let renderOptions: ChartSurfaceRenderOptions | undefined
      let stateTransition: ChartMarkStateTransition | undefined
      let stateTransitions:
        Readonly<Record<string, ChartMarkStateTransition>> | undefined
      let stateScene: ChartScene<TDatum, TXValue, TYValue> | undefined
      let dataMotionRevision = 0
      let dataMotionActive = false
      let stateFlushQueued = false
      let destroyed = false
      let pendingStateFocus:
        | {
            focus: ChartFocusState<TDatum, TXValue, TYValue> | null
            pointer: ChartTooltipPosition | null
            cursor: ChartCursorPresentation<TXValue, TYValue> | null
          }
        | undefined
      let desiredStateFocus:
        | {
            focus: ChartFocusState<TDatum, TXValue, TYValue> | null
            pointer: ChartTooltipPosition | null
            cursor: ChartCursorPresentation<TXValue, TYValue> | null
          }
        | undefined
      const svgElement = () => {
        const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!svg) {
          throw new Error(
            'The motion SVG renderer must produce an svg.ts-chart root element.',
          )
        }
        return svg
      }
      const publishPresentationPoints = (
        points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
      ) => {
        presentationPoints = points
        for (const listener of presentationListeners) listener(points)
      }
      const queuePendingStateFocus = () => {
        if (stateFlushQueued || !pendingStateFocus) return
        stateFlushQueued = true
        queueMicrotask(() => {
          stateFlushQueued = false
          if (destroyed || dataMotionActive || !pendingStateFocus) return
          const pending = pendingStateFocus
          pendingStateFocus = undefined
          applyStateFocus(pending.focus, pending.pointer, pending.cursor)
        })
      }
      const applyStateFocus = (
        focus: ChartFocusState<TDatum, TXValue, TYValue> | null,
        pointer: ChartTooltipPosition | null,
        cursor: ChartCursorPresentation<TXValue, TYValue> | null,
        resolved = scene
          ? resolveMarkStateScene(scene, focus, pointer)
          : undefined,
      ) => {
        if (!scene || !renderOptions || !resolved) return
        const presented = resolveFocusScene(resolved.scene, focus)
        cancelFocusAnimation()
        cancelFocusAnimation = () => {}
        const previousTransition = stateTransition
        const previousTransitions = stateTransitions
        if (presented.scene !== scene || stateScene || previousTransition) {
          const focusGuideLayers = detachSvgFocusGuideLayers(svgElement())
          cancelAnimation()
          if (presentationPoints !== scene.points) {
            publishPresentationPoints(scene.points)
          }
          const transition = resolved.transition ?? previousTransition
          const markTransitions = resolved.transitions ?? previousTransitions
          const reduced =
            motion.respectReducedMotion &&
            (transition?.respectReducedMotion ?? true) &&
            (container.ownerDocument.defaultView?.matchMedia?.(
              '(prefers-reduced-motion: reduce)',
            ).matches ??
              false)
          const markup = renderSvg(presented.scene, renderOptions)
          cancelAnimation = reduced
            ? reconcileChartSvg(container, markup)
            : motion.animateSvg({
                container,
                scene: presented.scene as ChartScene<TDatum>,
                previousScene: (stateScene ?? scene) as ChartScene<TDatum>,
                presentationPoints: scene.points,
                markup,
                phase: 'update',
                transition: markTransitions ? undefined : transition,
                markTransitions,
              })
          restoreSvgFocusGuideLayers(svgElement(), focusGuideLayers)
          stateScene =
            focus && presented.scene !== scene ? presented.scene : undefined
        }
        stateTransition = focus
          ? (resolved.transition ?? previousTransition)
          : undefined
        stateTransitions = focus
          ? (resolved.transitions ?? previousTransitions)
          : undefined
        paintMotionSvgFocus(svgElement(), presented.scene, focus)
        cancelFocusAnimation = paintMotionSvgFocusGuides({
          container,
          svg: svgElement(),
          scene: presented.scene,
          focus,
          pointer,
          cursor,
          idPrefix: renderOptions.idPrefix,
          motion,
          visible: visibleFocusGuides,
        })
        return presented.scene
      }
      const surface: ChartSurface<TDatum, TXValue, TYValue> = {
        renderer,
        get element() {
          return svgElement()
        },
        render(nextScene, options) {
          const previousScene = scene
          const initial = previousScene === undefined
          const resized = Boolean(
            previousScene &&
            (previousScene.width !== nextScene.width ||
              previousScene.height !== nextScene.height),
          )
          const reduced =
            motion.respectReducedMotion &&
            (container.ownerDocument.defaultView?.matchMedia?.(
              '(prefers-reduced-motion: reduce)',
            ).matches ??
              false)
          const animate =
            !reduced &&
            (initial
              ? motion.initial && !adoptedRoot
              : motion.resize || !resized)
          const viewportMoved = Boolean(
            previousScene &&
            viewportTranslationChanged(previousScene, nextScene),
          )
          const markup = renderSvg(nextScene, options)
          cancelAnimation()
          const previousPresentation =
            presentationPoints ?? previousScene?.points ?? []
          cancelFocusAnimation()
          cancelFocusAnimation = () => {}
          const retainsFocusGuideLayers = Boolean(
            previousScene?.focusGuides?.length,
          )
          const focusGuideLayers = retainsFocusGuideLayers
            ? detachSvgFocusGuideLayers(svgElement())
            : {}
          for (const placement of visibleFocusGuides) {
            if (
              !nextScene.focusGuides?.some(
                (guide) => guide.placement === placement,
              )
            ) {
              visibleFocusGuides.delete(placement)
            }
          }
          const revision = ++dataMotionRevision
          stateScene = undefined
          stateTransition = undefined
          scene = nextScene
          renderOptions = options
          dataMotionActive = animate && !viewportMoved
          pendingStateFocus = dataMotionActive ? desiredStateFocus : undefined
          if (animate && !viewportMoved) {
            if (initial) reconcileChartSvg(container, markup)
            cancelAnimation = motion.animateSvg({
              container,
              scene: nextScene as ChartScene<TDatum>,
              previousScene: previousScene as ChartScene<TDatum> | undefined,
              presentationPoints:
                previousPresentation as readonly ChartPoint<TDatum>[],
              markup,
              phase: initial ? 'initial' : 'update',
              setPresentationPoints(points) {
                publishPresentationPoints(
                  points as readonly ChartPoint<TDatum, TXValue, TYValue>[],
                )
                if (
                  revision === dataMotionRevision &&
                  points === nextScene.points
                ) {
                  dataMotionActive = false
                  queuePendingStateFocus()
                }
              },
            })
          } else {
            reconcileChartSvg(container, markup)
            publishPresentationPoints(nextScene.points)
            dataMotionActive = false
          }
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
          stateScene = undefined
          renderOptions = options
          stateTransition = undefined
          stateTransitions = undefined
        },
        clientToScene(currentScene, clientX, clientY) {
          return svgClientToScene(svgElement(), currentScene, clientX, clientY)
        },
        getPresentationPoints() {
          if (
            !scene ||
            !presentationPoints ||
            presentationPoints === scene.points
          ) {
            return undefined
          }
          return presentationPoints
        },
        subscribePresentationPoints(listener) {
          presentationListeners.add(listener)
          return () => presentationListeners.delete(listener)
        },
        paintFocus(focus, pointer, cursor) {
          if (!scene || !renderOptions) return
          desiredStateFocus = {
            focus,
            pointer: pointer ?? null,
            cursor: cursor ?? null,
          }
          const resolved = resolveMarkStateScene(scene, focus, pointer)
          if (dataMotionActive) {
            pendingStateFocus = desiredStateFocus
            paintMotionSvgFocus(svgElement(), resolved.scene, focus)
            cancelFocusAnimation()
            cancelFocusAnimation = paintMotionSvgFocusGuides({
              container,
              svg: svgElement(),
              scene: resolved.scene,
              focus,
              pointer,
              cursor,
              idPrefix: renderOptions.idPrefix,
              motion,
              visible: visibleFocusGuides,
            })
            return resolved.scene
          }
          pendingStateFocus = undefined
          return applyStateFocus(
            focus,
            pointer ?? null,
            cursor ?? null,
            resolved,
          )
        },
        destroy() {
          destroyed = true
          dataMotionRevision += 1
          pendingStateFocus = undefined
          desiredStateFocus = undefined
          cancelAnimation()
          presentationListeners.clear()
          cancelFocusAnimation()
        },
      }
      return surface
    },
  }
  return renderer
}

function paintMotionSvgFocus(
  svg: SVGSVGElement,
  scene: ChartScene,
  focus: ChartFocusState | null,
) {
  const sceneLayers = collectMotionFocusLayers(scene.nodes)
  const elements = svg.querySelectorAll<SVGGElement>(
    '[data-ts-focus-layer]:not([data-ts-focus-guide-layer])',
  )
  elements.forEach((element, index) => {
    const layer = sceneLayers[index]
    if (layer?.focus?.retarget) {
      const hasChildren = element.children.length > 0
      element.setAttribute('visibility', hasChildren ? 'visible' : 'hidden')
      element
        .querySelectorAll<SVGElement>('[data-ts-key]')
        .forEach((child) => child.setAttribute('visibility', 'visible'))
      return
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

function paintMotionSvgFocusGuides<TDatum>(options: {
  container: HTMLElement
  svg: SVGSVGElement
  scene: ChartScene<TDatum>
  focus: ChartFocusState<TDatum> | null
  pointer?: Parameters<typeof resolveFocusGuides>[2]
  cursor?: ChartCursorPresentation | null
  idPrefix?: string
  motion: ChartSvgMotionDriver<TDatum>
  visible: Set<'under' | 'over'>
}) {
  const {
    container,
    svg,
    scene,
    focus,
    pointer,
    cursor,
    idPrefix = '',
    motion,
    visible,
  } = options
  const presentation = resolveFocusGuides(scene, focus, pointer, cursor)
  const reduced =
    motion.respectReducedMotion &&
    (container.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches ??
      false)
  const cancellations: (() => void)[] = []

  for (const placement of ['under', 'over'] as const) {
    if (!scene.focusGuides?.some((guide) => guide.placement === placement)) {
      removeSvgFocusGuideLayer(svg, placement)
      visible.delete(placement)
      continue
    }
    const layer = ensureSvgFocusGuideLayer(svg, placement)
    const nodes = presentation[placement]
    if (!nodes.length) {
      layer.setAttribute('visibility', 'hidden')
      visible.delete(placement)
      continue
    }

    const markup = renderFocusGuideLayer(nodes, placement, idPrefix)
    if (reduced || !visible.has(placement)) {
      reconcileChartSvgFragment(layer, markup)
    } else {
      cancellations.push(
        motion.animateSvgFragment({
          container,
          root: layer,
          scene,
          markup,
        }),
      )
    }
    visible.add(placement)
  }

  return () => cancellations.forEach((cancel) => cancel())
}

function collectMotionFocusLayers(nodes: ChartScene['nodes']): SceneGroup[] {
  const layers: SceneGroup[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.focus) layers.push(node)
    else layers.push(...collectMotionFocusLayers(node.children))
  }
  return layers
}

function createBarTracks(
  root: SVGSVGElement,
  scene: ChartScene,
  points: ReadonlyMap<string, ChartPoint>,
  timingFor: TimingResolver,
  runtime: MotionRuntime,
): MotionTrack[] {
  const groups = [
    ...root.querySelectorAll<SVGGElement>(
      'g.ts-chart__bar-y, g.ts-chart__bar-x',
    ),
  ]
  const tracks: MotionTrack[] = []

  groups.forEach((group, seriesIndex) => {
    const horizontal = group.classList.contains('ts-chart__bar-x')
    const rectangles = [...group.children].filter(
      (element): element is SVGRectElement => element.localName === 'rect',
    )
    const seriesKey =
      group.getAttribute('data-ts-key') ?? `series:${seriesIndex}`

    rectangles.forEach((rectangle, datumIndex) => {
      const key =
        rectangle.getAttribute('data-ts-key') ?? `${seriesKey}:${datumIndex}`
      const point = points.get(key)
      const targetX = numberAttribute(rectangle, 'x')
      const targetY = numberAttribute(rectangle, 'y')
      const targetWidth = numberAttribute(rectangle, 'width')
      const targetHeight = numberAttribute(rectangle, 'height')
      const baseline = resolveBarBaseline(
        scene,
        point,
        horizontal,
        horizontal ? targetX : targetY + targetHeight,
      )
      const timing = timingFor({
        phase: 'enter',
        role: 'bar',
        key,
        markId: point?.markId ?? motionMarkId(scene, seriesKey),
        seriesKey,
        seriesIndex,
        datumIndex,
        datumCount: rectangles.length,
        datum: point?.datum,
        point,
      })

      rectangle.dataset.tsMotionRole = 'bar'
      const names = horizontal ? ['x', 'width'] : ['y', 'height']
      const from = [baseline, 0]
      const to = horizontal ? [targetX, targetWidth] : [targetY, targetHeight]
      const states = names.flatMap((name, index) =>
        elementValueStates(runtime, rectangle, name, [from[index] ?? 0]),
      )
      const apply = (values: readonly number[]) => {
        rectangle.setAttribute(names[0]!, formatNumber(values[0] ?? 0))
        rectangle.setAttribute(names[1]!, formatNumber(values[1] ?? 0))
      }
      const finish = () => {
        rectangle.setAttribute('x', formatNumber(targetX))
        rectangle.setAttribute('y', formatNumber(targetY))
        rectangle.setAttribute('width', formatNumber(targetWidth))
        rectangle.setAttribute('height', formatNumber(targetHeight))
        delete rectangle.dataset.tsMotionRole
      }
      apply(from)
      tracks.push({
        ...timing,
        values: bindMotionValues(states, from, to),
        apply,
        finish,
        cancel: () => delete rectangle.dataset.tsMotionRole,
      })
    })
  })

  return tracks
}

function createLineTracks(
  root: SVGSVGElement,
  scene: ChartScene,
  timingFor: TimingResolver,
): MotionTrack[] {
  const groups = [...root.querySelectorAll<SVGGElement>('g.ts-chart__line')]
  return groups.map((group, seriesIndex) => {
    const seriesKey = group.getAttribute('data-ts-key') ?? `line:${seriesIndex}`
    const timing = timingFor({
      phase: 'enter',
      role: 'line',
      key: seriesKey,
      markId: motionMarkId(scene, seriesKey),
      seriesKey,
      seriesIndex,
      datumIndex: 0,
      datumCount: 1,
      datum: undefined,
      point: undefined,
    })
    const document = root.ownerDocument
    let definitions = root.querySelector<SVGDefsElement>('defs')
    let ownsDefinitions = false
    if (!definitions) {
      definitions = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'defs',
      )
      root.prepend(definitions)
      ownsDefinitions = true
    }
    const clip = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'clipPath',
    )
    const rectangle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    )
    const id = `ts-chart-motion-clip-${++clipId}`
    clip.id = id
    rectangle.setAttribute('x', formatNumber(scene.chart.x))
    rectangle.setAttribute('y', formatNumber(scene.chart.y))
    rectangle.setAttribute('width', '0')
    rectangle.setAttribute('height', formatNumber(scene.chart.height))
    clip.append(rectangle)
    definitions.append(clip)
    const previousClip = group.getAttribute('clip-path')
    group.setAttribute('clip-path', `url(#${id})`)
    group.dataset.tsMotionRole = 'line'
    const cleanup = () => {
      if (previousClip === null) group.removeAttribute('clip-path')
      else group.setAttribute('clip-path', previousClip)
      delete group.dataset.tsMotionRole
      clip.remove()
      if (ownsDefinitions && !definitions?.children.length) definitions.remove()
    }
    return {
      ...timing,
      values: bindMotionValues(undefined, [0], [scene.chart.width]),
      apply(values) {
        rectangle.setAttribute('width', formatNumber(values[0] ?? 0))
      },
      finish: cleanup,
      cancel: cleanup,
    }
  })
}

function reconcileMotionSvg(
  context: ChartSvgMotionContext,
  options: ResolvedMotionOptions,
  timingFor: TimingResolver,
  runtime: MotionRuntime,
) {
  const template = context.container.ownerDocument.createElement('template')
  template.innerHTML = context.markup ?? ''
  const nextRoot = template.content.firstElementChild
  const currentRoot = context.container.firstElementChild
  if (
    !nextRoot ||
    !currentRoot ||
    currentRoot.namespaceURI !== nextRoot.namespaceURI ||
    currentRoot.localName !== nextRoot.localName
  ) {
    if (nextRoot) context.container.replaceChildren(nextRoot)
    context.setPresentationPoints?.(context.scene.points)
    return () => {}
  }

  const tracks: MotionTrack[] = []
  const pathPlans = createRollingPathPlans(
    currentRoot,
    nextRoot,
    context.previousScene,
    context.scene,
    timingFor,
  )
  reconcileMotionElement(currentRoot, nextRoot, tracks, {
    scene: context.scene,
    previousScene: context.previousScene,
    timingFor,
    options,
    runtime,
    pathPlans,
  })
  const root = currentRoot as SVGSVGElement
  const presentation = createPresentationTracks(
    root,
    context.scene,
    context.presentationPoints ?? context.previousScene?.points ?? [],
    timingFor,
    context.setPresentationPoints,
    'update',
    runtime,
    pathPlans,
  )
  return runTracks(root, [...tracks, ...presentation.tracks], {
    publish: presentation.publish,
    finish: () => context.setPresentationPoints?.(context.scene.points),
  })
}

interface MotionReconcileContext {
  scene: ChartScene
  previousScene?: ChartScene
  timingFor: TimingResolver
  options: ResolvedMotionOptions
  runtime: MotionRuntime
  pathPlans: RollingPathPlans
}

function createRollingPathPlans(
  currentRoot: Element,
  nextRoot: Element,
  previousScene: ChartScene | undefined,
  scene: ChartScene,
  timingFor: TimingResolver,
): RollingPathPlans {
  const elements = new Map<string, PlannedRollingPath>()
  const points = new Map<string, PlannedRollingPath>()
  if (!previousScene) return { elements, points }

  const currentPaths = keyedElementMap(
    currentRoot,
    'g.ts-chart__line path, g.ts-chart__area path',
  )
  const nextPaths = keyedElementMap(
    nextRoot,
    'g.ts-chart__line path, g.ts-chart__area path',
  )
  for (const [key] of nextPaths) {
    const currentPath = currentPaths.get(key)
    if (!currentPath) continue
    const motionContext = elementTimingContext(currentPath, 'update', scene)
    if (!motionContext) continue
    const timing = timingFor(motionContext)
    if (!isRollingPathMotion(timing.path)) continue
    const previous = scenePathSnapshot(previousScene, key)
    const next = scenePathSnapshot(scene, key)
    let outcome: RollingPathPlan =
      previous && next
        ? resolveRollingPathPlan(previous, next, timing.path)
        : {
            kind: 'fallback',
            fallback: timing.path.fallback ?? 'snap',
            reason: 'missing-semantic-points',
          }
    if (outcome.kind === 'transform') {
      outcome = {
        ...outcome,
        transform: composeRollingTransform(
          parseRollingTransform(currentPath.getAttribute('transform')),
          outcome.transform,
        ),
      }
    }
    const planned: PlannedRollingPath = {
      key,
      outcome,
      points: next?.points ?? [],
      previousPoints: previous?.points ?? [],
      timing,
    }
    elements.set(key, planned)
    for (const point of previous?.points ?? []) {
      points.set(pointIdentity(point), planned)
    }
    for (const point of next?.points ?? []) {
      points.set(pointIdentity(point), planned)
    }
  }
  return { elements, points }
}

function scenePathSnapshot(
  scene: ChartScene,
  key: string,
): RollingPathSnapshot | undefined {
  const context = findSceneNodeContext(scene.nodes, key)
  const node = context?.node
  if (!node || (node.kind !== 'polyline' && node.kind !== 'area')) {
    return undefined
  }
  const interaction = node.interaction
  const points =
    interaction && 'points' in interaction ? (interaction.points ?? []) : []
  if (!points.length) return undefined
  return {
    kind: node.kind,
    points,
    geometry: node.points,
    chart: scene.chart,
    yScale: scene.scales.y!,
    viewportTranslate: {
      x: context.translateX,
      y: context.translateY,
    },
    clipped: context.clipped,
    customPath: node.path !== undefined,
  }
}

function findSceneNodeContext(
  nodes: readonly SceneNode[],
  key: string,
  translateX = 0,
  translateY = 0,
  clipped = false,
):
  | {
      node: SceneNode
      translateX: number
      translateY: number
      clipped: boolean
    }
  | undefined {
  for (const node of nodes) {
    if (node.key === key) return { node, translateX, translateY, clipped }
    if (node.kind === 'group') {
      const nested = findSceneNodeContext(
        node.children,
        key,
        translateX + (node.translateX ?? 0),
        translateY + (node.translateY ?? 0),
        clipped || node.clip !== undefined,
      )
      if (nested) return nested
    }
  }
  return undefined
}

function isRollingPathMotion(
  path: ChartMotionPath,
): path is ChartRollingPathMotion {
  return typeof path === 'object' && path.update === 'rolling'
}

function composeRollingTransform(
  current: RollingPathTransform,
  next: RollingPathTransform,
): RollingPathTransform {
  return {
    x: current.x + next.x,
    yScale: current.yScale * next.yScale,
    y: current.yScale * next.y + current.y,
  }
}

function parseRollingTransform(value: string | null): RollingPathTransform {
  if (!value) return { x: 0, yScale: 1, y: 0 }
  const translated = translatedX(value)
  if (translated !== undefined) return { x: translated, yScale: 1, y: 0 }
  const match =
    /^matrix\(\s*1(?:\.0+)?\s+0(?:\.0+)?\s+0(?:\.0+)?\s+(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s+(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s+(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*\)$/i.exec(
      value,
    )
  if (!match) return { x: 0, yScale: 1, y: 0 }
  const yScale = Number(match[1])
  const x = Number(match[2])
  const y = Number(match[3])
  return Number.isFinite(x) && Number.isFinite(yScale) && Number.isFinite(y)
    ? { x, yScale, y }
    : { x: 0, yScale: 1, y: 0 }
}

const motionAttributes = new Set([
  'cx',
  'cy',
  'd',
  'fill-opacity',
  'font-size',
  'font-weight',
  'height',
  'opacity',
  'r',
  'rx',
  'stroke-opacity',
  'stroke-width',
  'transform',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
])

const rollingPointGeometryAttributes = new Set([
  'cx',
  'cy',
  'height',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
])

function reconcileMotionElement(
  current: Element,
  next: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
) {
  addUpdateTrack(current, next, tracks, context)

  if (!next.firstElementChild) {
    if (current.firstElementChild) {
      for (const child of [...current.children]) {
        addExitMotionTrack(child, tracks, context)
      }
    } else if (current.textContent !== next.textContent) {
      current.textContent = next.textContent
    }
    return
  }

  const currentChildren = [...current.children]
  const nextChildren = [...next.children]
  const currentByIdentity = indexMotionChildren(currentChildren)
  const nextIdentities = motionIdentities(nextChildren)
  const retained = new Set<Element>()
  let cursor = current.firstElementChild

  nextChildren.forEach((nextChild, index) => {
    const matched = currentByIdentity.get(nextIdentities[index])
    let rendered: Element
    if (
      matched &&
      matched.namespaceURI === nextChild.namespaceURI &&
      matched.localName === nextChild.localName
    ) {
      rendered = matched
      retained.add(matched)
      if (rendered !== cursor) current.insertBefore(rendered, cursor)
      reconcileMotionElement(rendered, nextChild, tracks, context)
    } else {
      rendered = nextChild.cloneNode(true) as Element
      current.insertBefore(rendered, cursor)
      addEnterMotionTrack(rendered, tracks, context)
    }
    cursor = rendered.nextElementSibling
  })

  for (const child of currentChildren) {
    if (!retained.has(child) && child.parentElement === current) {
      addExitMotionTrack(child, tracks, context)
    }
  }
}

function addUpdateTrack(
  current: Element,
  next: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
) {
  let timingContext = elementTimingContext(current, 'update', context.scene)
  let timing: ResolvedTiming | undefined
  const pathKey = current.getAttribute('data-ts-key')
  const rolling = pathKey ? context.pathPlans.elements.get(pathKey) : undefined
  const rollingTransform =
    rolling?.outcome.kind === 'transform'
      ? rolling.outcome.transform
      : undefined
  const rollingSnap =
    rolling?.outcome.kind === 'fallback' && rolling.outcome.fallback === 'snap'
  const pointRolling = timingContext?.point
    ? context.pathPlans.points.get(pointIdentity(timingContext.point))
    : undefined
  const pointRollingSnap =
    pointRolling?.outcome.kind === 'fallback' &&
    pointRolling.outcome.fallback === 'snap'
  const semanticPath = addSemanticPathUpdateTrack(
    current,
    next,
    tracks,
    context,
    timingContext,
  )
  const nextNames = new Set(next.getAttributeNames())
  for (const name of current.getAttributeNames()) {
    if (
      !nextNames.has(name) &&
      !(rollingTransform !== undefined && name === 'transform')
    ) {
      current.removeAttribute(name)
    }
  }

  const attributes: MotionAttribute[] = []
  for (const name of nextNames) {
    const target = next.getAttribute(name)
    const previous = current.getAttribute(name)
    if (target === previous) continue
    if (semanticPath && name === 'd') continue
    if (
      pointRollingSnap &&
      rollingPointGeometryAttributes.has(name) &&
      target !== null
    ) {
      current.setAttribute(name, target)
      continue
    }
    if (
      (rollingTransform !== undefined || rollingSnap) &&
      name === 'd' &&
      target !== null
    ) {
      current.setAttribute(name, target)
      continue
    }
    const parsed =
      previous !== null && target !== null && motionAttributes.has(name)
        ? parseMotionAttribute(previous, target)
        : undefined
    if (parsed) attributes.push({ name, ...parsed, target })
    else if (target !== null) current.setAttribute(name, target)
  }

  if (rollingTransform && timingContext && rolling) {
    current.setAttribute('data-ts-motion-role', timingContext.role)
    const apply = (values: readonly number[]) => {
      current.setAttribute(
        'transform',
        `matrix(1 0 0 ${formatNumber(values[1] ?? 1)} ${formatNumber(values[0] ?? 0)} ${formatNumber(values[2] ?? 0)})`,
      )
    }
    const from = [
      rollingTransform.x,
      rollingTransform.yScale,
      rollingTransform.y,
    ]
    apply(from)
    tracks.push({
      ...rolling.timing,
      values: bindMotionValues(undefined, from, [0, 1, 0]),
      apply,
      finish() {
        current.removeAttribute('transform')
        current.removeAttribute('data-ts-motion-role')
      },
      cancel() {
        current.removeAttribute('data-ts-motion-role')
      },
    })
  }

  if (!attributes.length) return

  timingContext ??= elementTimingContext(current, 'update', context.scene)
  if (!timingContext) {
    finishMotionAttributes(current, attributes)
    return
  }
  timing ??=
    pointRolling?.outcome.kind === 'transform'
      ? pointRolling.timing
      : context.timingFor(timingContext)
  current.setAttribute('data-ts-motion-role', timingContext.role)
  const states = attributes.flatMap((attribute) =>
    elementValueStates(
      context.runtime,
      current,
      attribute.name,
      attribute.from,
    ),
  )
  const from = attributes.flatMap((attribute) => attribute.from)
  const to = attributes.flatMap((attribute) => attribute.to)
  tracks.push({
    ...timing,
    values: bindMotionValues(states, from, to),
    apply(values) {
      let offset = 0
      for (const attribute of attributes) {
        const count = attribute.to.length
        current.setAttribute(
          attribute.name,
          formatMotionAttribute(
            attribute.skeleton,
            values.slice(offset, offset + count),
          ),
        )
        offset += count
      }
    },
    finish() {
      finishMotionAttributes(current, attributes)
      current.removeAttribute('data-ts-motion-role')
    },
    cancel() {
      current.removeAttribute('data-ts-motion-role')
    },
  })
}

function addSemanticPathUpdateTrack(
  current: Element,
  next: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
  timingContext: ChartMotionContext | undefined,
) {
  if (current.localName !== 'path') return false
  const key = current.getAttribute('data-ts-key')
  const targetPath = next.getAttribute('d')
  if (!key || !targetPath || !context.previousScene) return false
  const previous = sceneMotionEntry(context.previousScene, key)?.metadata.path
  const target = sceneMotionEntry(context.scene, key)?.metadata.path
  const geometry = compatiblePathGeometry(previous, target)
  if (!geometry) return false
  const resolvedContext =
    timingContext ?? elementTimingContext(current, 'update', context.scene)
  if (!resolvedContext) return false
  const sourceValues = livePathGeometryValues(
    current,
    geometry.source,
    context.runtime,
  )
  current.setAttribute('data-ts-motion-role', resolvedContext.role)
  tracks.push(
    semanticPathTrack({
      element: current,
      sourceValues,
      target: geometry.target,
      targetPath,
      timing: context.timingFor(resolvedContext),
      runtime: context.runtime,
      finish() {
        current.removeAttribute('data-ts-motion-role')
      },
      cancel() {
        current.removeAttribute('data-ts-motion-role')
      },
    }),
  )
  return true
}

function semanticPathTrack(options: {
  element: Element
  sourceValues: readonly number[]
  target: SceneMotionPathGeometry
  targetPath: string
  timing: ResolvedTiming
  runtime: MotionRuntime
  finish: () => void
  cancel: () => void
}): MotionTrack {
  const states = elementValueStates(
    options.runtime,
    options.element,
    'semantic-path',
    options.sourceValues,
  )
  return {
    ...options.timing,
    values: bindMotionValues(
      states,
      options.sourceValues,
      options.target.values,
    ),
    apply(values) {
      const path = options.target.project(values)
      if (path) options.element.setAttribute('d', path)
    },
    finish() {
      options.element.setAttribute('d', options.targetPath)
      options.finish()
    },
    cancel: options.cancel,
  }
}

function translatedX(transform: string | null) {
  if (!transform) return undefined
  const match =
    /^translate\(\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(?:[, ]\s*0(?:\.0+)?)?\s*\)$/i.exec(
      transform,
    )
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function addEnterMotionTrack(
  element: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
) {
  const timingContext = elementTimingContext(element, 'enter', context.scene)
  if (!timingContext) return
  const timing = context.timingFor(timingContext)
  element.setAttribute('data-ts-motion-role', timingContext.role)

  const pointRolling = timingContext.point
    ? context.pathPlans.points.get(pointIdentity(timingContext.point))
    : undefined
  if (element.localName === 'circle' && pointRolling) {
    if (pointRolling.outcome.kind === 'fallback') {
      if (pointRolling.outcome.fallback === 'snap') {
        element.removeAttribute('data-ts-motion-role')
        return
      }
    } else {
      const targetX = numberAttribute(element, 'cx')
      const targetY = numberAttribute(element, 'cy')
      const { x, yScale, y } = pointRolling.outcome.transform
      const from = [targetX + x, targetY * yScale + y]
      const to = [targetX, targetY]
      const apply = (values: readonly number[]) => {
        element.setAttribute('cx', formatNumber(values[0] ?? targetX))
        element.setAttribute('cy', formatNumber(values[1] ?? targetY))
      }
      apply(from)
      tracks.push({
        ...pointRolling.timing,
        values: bindMotionValues(undefined, from, to),
        apply,
        finish() {
          apply(to)
          element.removeAttribute('data-ts-motion-role')
        },
        cancel() {
          element.removeAttribute('data-ts-motion-role')
        },
      })
      return
    }
  }

  if (
    timingContext.role === 'bar' &&
    element.localName === 'rect' &&
    !element.closest('[data-ts-focus-retarget]')
  ) {
    const horizontal = Boolean(element.closest('g.ts-chart__bar-x'))
    const targetX = numberAttribute(element, 'x')
    const targetY = numberAttribute(element, 'y')
    const targetWidth = numberAttribute(element, 'width')
    const targetHeight = numberAttribute(element, 'height')
    const baseline = resolveBarBaseline(
      context.scene,
      timingContext.point,
      horizontal,
      horizontal ? targetX : targetY + targetHeight,
    )
    const names = horizontal ? ['x', 'width'] : ['y', 'height']
    const from = [baseline, 0]
    const to = horizontal ? [targetX, targetWidth] : [targetY, targetHeight]
    const states = names.flatMap((name, index) =>
      elementValueStates(context.runtime, element, name, [from[index] ?? 0]),
    )
    const apply = (values: readonly number[]) => {
      element.setAttribute(names[0]!, formatNumber(values[0] ?? 0))
      element.setAttribute(names[1]!, formatNumber(values[1] ?? 0))
    }
    apply(from)
    tracks.push({
      ...timing,
      values: bindMotionValues(states, from, to),
      apply,
      finish() {
        element.setAttribute('x', formatNumber(targetX))
        element.setAttribute('y', formatNumber(targetY))
        element.setAttribute('width', formatNumber(targetWidth))
        element.setAttribute('height', formatNumber(targetHeight))
        element.removeAttribute('data-ts-motion-role')
      },
      cancel() {
        element.removeAttribute('data-ts-motion-role')
      },
    })
    return
  }

  const hierarchyGeometry = hierarchyRelatedGeometry(
    element,
    context.scene,
    context.previousScene,
    'enter',
  )
  if (hierarchyGeometry) {
    const sourceValues = livePathGeometryValues(
      hierarchyGeometry.relatedElement,
      hierarchyGeometry.source,
      context.runtime,
    )
    const sourcePath = hierarchyGeometry.target.project(sourceValues)
    if (sourcePath) element.setAttribute('d', sourcePath)
    tracks.push(
      semanticPathTrack({
        element,
        sourceValues,
        target: hierarchyGeometry.target,
        targetPath: hierarchyGeometry.targetPath,
        timing,
        runtime: context.runtime,
        finish() {},
        cancel() {},
      }),
    )
  }

  const targetOpacity = element.getAttribute('opacity')
  const opacity = finiteOpacity(targetOpacity)
  element.setAttribute('opacity', '0')
  const states = elementValueStates(context.runtime, element, 'opacity', [0])
  tracks.push({
    ...timing,
    values: bindMotionValues(states, [0], [opacity]),
    apply(values) {
      element.setAttribute('opacity', formatNumber(values[0] ?? 0))
    },
    finish() {
      if (targetOpacity === null) element.removeAttribute('opacity')
      else element.setAttribute('opacity', targetOpacity)
      element.removeAttribute('data-ts-motion-role')
    },
    cancel() {
      element.removeAttribute('data-ts-motion-role')
    },
  })
}

function addExitMotionTrack(
  element: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
) {
  const retargetLayer = element.closest<SVGGElement>(
    'g[data-ts-focus-retarget]',
  )
  const cleanup = () => {
    element.remove()
    if (retargetLayer && !retargetLayer.children.length) {
      retargetLayer.setAttribute('visibility', 'hidden')
    }
  }
  const timingContext = elementTimingContext(
    element,
    'exit',
    context.previousScene ?? context.scene,
  )
  if (!timingContext) {
    cleanup()
    return
  }
  const pointRolling = timingContext.point
    ? context.pathPlans.points.get(pointIdentity(timingContext.point))
    : undefined
  if (
    pointRolling?.outcome.kind === 'fallback' &&
    pointRolling.outcome.fallback === 'snap'
  ) {
    cleanup()
    return
  }
  if (
    element.localName === 'circle' &&
    pointRolling?.outcome.kind === 'transform'
  ) {
    const startX = numberAttribute(element, 'cx')
    const startY = numberAttribute(element, 'cy')
    const { x, yScale, y } = pointRolling.outcome.transform
    const targetX = startX - x
    const targetY = (startY - y) / yScale
    const apply = (values: readonly number[]) => {
      element.setAttribute('cx', formatNumber(values[0] ?? targetX))
      element.setAttribute('cy', formatNumber(values[1] ?? targetY))
    }
    element.setAttribute('data-ts-motion-role', timingContext.role)
    tracks.push({
      ...pointRolling.timing,
      values: bindMotionValues(undefined, [startX, startY], [targetX, targetY]),
      apply,
      finish: cleanup,
      cancel: cleanup,
    })
    return
  }
  const hierarchyGeometry = hierarchyRelatedGeometry(
    element,
    context.previousScene,
    context.scene,
    'exit',
  )
  if (hierarchyGeometry) {
    const targetPath = hierarchyGeometry.target.project(
      hierarchyGeometry.target.values,
    )
    if (targetPath) {
      const sourceValues = livePathGeometryValues(
        element,
        hierarchyGeometry.source,
        context.runtime,
      )
      tracks.push(
        semanticPathTrack({
          element,
          sourceValues,
          target: hierarchyGeometry.target,
          targetPath,
          timing: context.timingFor(timingContext),
          runtime: context.runtime,
          finish() {},
          cancel() {},
        }),
      )
    }
  }
  const target = Number(element.getAttribute('opacity') ?? 1)
  const opacity = Number.isFinite(target) ? target : 1
  element.setAttribute('data-ts-motion-role', timingContext.role)
  const states = elementValueStates(context.runtime, element, 'opacity', [
    opacity,
  ])
  tracks.push({
    ...context.timingFor(timingContext),
    values: bindMotionValues(states, [opacity], [0]),
    apply(values) {
      element.setAttribute('opacity', formatNumber(values[0] ?? 0))
    },
    finish: cleanup,
    cancel: cleanup,
  })
}

function hierarchyRelatedGeometry(
  element: Element,
  ownerScene: ChartScene | undefined,
  relatedScene: ChartScene | undefined,
  phase: 'enter' | 'exit',
) {
  const relation = hierarchyMotionRelation(element, ownerScene, relatedScene)
  if (!relation) return undefined
  const source =
    phase === 'enter'
      ? relation.related.metadata.path
      : relation.owner.metadata.path
  const target =
    phase === 'enter'
      ? relation.owner.metadata.path
      : relation.related.metadata.path
  const geometry = compatiblePathGeometry(source, target)
  if (!geometry) return undefined
  return {
    ...geometry,
    relatedElement: relation.relatedElement,
    targetPath: phase === 'enter' ? relation.ownerPath : relation.relatedPath,
  }
}

function hierarchyMotionRelation(
  element: Element,
  ownerScene: ChartScene | undefined,
  relatedScene: ChartScene | undefined,
) {
  if (element.localName !== 'path' || !ownerScene || !relatedScene) {
    return undefined
  }
  const key = element.getAttribute('data-ts-key')
  const ownerPath = element.getAttribute('d')
  if (!key || !ownerPath) return undefined
  const owner = sceneMotionEntry(ownerScene, key)
  const hierarchy = owner?.metadata.hierarchy
  if (!owner || !hierarchy) return undefined
  const related = sceneMotionEntries(relatedScene)
  let ancestor: SceneMotionEntry | undefined
  for (let index = hierarchy.ancestorIds.length - 1; index >= 0; index -= 1) {
    const ancestorId = hierarchy.ancestorIds[index]
    ancestor = related.find(
      (entry) =>
        entry.metadata.hierarchy?.markId === hierarchy.markId &&
        entry.metadata.hierarchy.id === ancestorId,
    )
    if (ancestor) break
  }
  if (!ancestor) return undefined
  const root = element.closest<SVGSVGElement>('svg')
  const relatedElement = root
    ? [...root.querySelectorAll<Element>('path[data-ts-key]')].find(
        (candidate) =>
          candidate.getAttribute('data-ts-key') === ancestor.node.key,
      )
    : undefined
  const relatedPath = relatedElement?.getAttribute('d')
  if (!relatedElement || !relatedPath) return undefined
  return {
    owner,
    related: ancestor,
    relatedElement,
    ownerPath,
    relatedPath,
  }
}

interface SceneMotionEntry {
  node: SceneNode
  metadata: SceneMotionMetadata
}

const sceneMotionEntriesCache = new WeakMap<
  ChartScene,
  readonly SceneMotionEntry[]
>()

function sceneMotionEntries(scene: ChartScene) {
  const cached = sceneMotionEntriesCache.get(scene)
  if (cached) return cached
  const entries: SceneMotionEntry[] = []
  const visit = (nodes: readonly SceneNode[]) => {
    for (const node of nodes) {
      const metadata = (node as SceneMotionNode)[sceneMotionNode]
      if (metadata) entries.push({ node, metadata })
      if (node.kind === 'group') visit(node.children)
    }
  }
  visit(scene.nodes)
  sceneMotionEntriesCache.set(scene, entries)
  return entries
}

function sceneMotionEntry(scene: ChartScene, key: string) {
  return sceneMotionEntries(scene).find((entry) => entry.node.key === key)
}

function compatiblePathGeometry(
  source: SceneMotionPathGeometry | undefined,
  target: SceneMotionPathGeometry | undefined,
) {
  if (
    !source ||
    !target ||
    source.project !== target.project ||
    source.values.length !== target.values.length ||
    source.values.length === 0
  ) {
    return undefined
  }
  return { source, target }
}

function livePathGeometryValues(
  element: Element,
  geometry: SceneMotionPathGeometry,
  runtime: MotionRuntime,
) {
  const states = elementValueStates(
    runtime,
    element,
    'semantic-path',
    geometry.values,
  )
  const staticPath = geometry.project(geometry.values)
  return staticPath && element.getAttribute('d') === staticPath
    ? geometry.values
    : states.map((state) => state.value)
}

function finiteOpacity(value: string | null) {
  const opacity = Number(value ?? 1)
  return Number.isFinite(opacity) ? opacity : 1
}

function elementTimingContext(
  element: Element,
  phase: ChartMotionPhase,
  scene: ChartScene,
): ChartMotionContext | undefined {
  if (element.closest('[data-ts-focus-retarget]')) {
    return guideOrMarkTimingContext(element, phase, scene)
  }
  const barGroup = element.closest<SVGGElement>(
    'g.ts-chart__bar-y, g.ts-chart__bar-x',
  )
  const lineGroup = element.closest<SVGGElement>('g.ts-chart__line')
  const group = barGroup ?? lineGroup
  if (!group) return guideOrMarkTimingContext(element, phase, scene)
  const role: ChartMotionRole = barGroup ? 'bar' : 'line'
  const root = element.closest<SVGSVGElement>('svg')
  const groups = root
    ? [
        ...root.querySelectorAll<SVGGElement>(
          role === 'bar'
            ? 'g.ts-chart__bar-y, g.ts-chart__bar-x'
            : 'g.ts-chart__line',
        ),
      ]
    : [group]
  const seriesIndex = Math.max(0, groups.indexOf(group))
  const seriesKey =
    group.getAttribute('data-ts-key') ?? `${role}:${seriesIndex}`
  const key =
    element.getAttribute('data-ts-key') ??
    (role === 'line' ? seriesKey : `${seriesKey}:0`)
  const point = scene.points.find(
    (candidate) => candidate.key === key || key === `${candidate.key}:dot`,
  )
  const rectangles = barGroup
    ? [...barGroup.children].filter((child) => child.localName === 'rect')
    : []
  const datumIndex =
    point?.datumIndex ?? Math.max(0, rectangles.indexOf(element))
  return {
    phase,
    role,
    key,
    markId: point?.markId ?? motionMarkId(scene, seriesKey),
    seriesKey,
    seriesIndex,
    datumIndex,
    datumCount: barGroup ? Math.max(1, rectangles.length) : 1,
    datum: point?.datum,
    point,
  }
}

function guideOrMarkTimingContext(
  element: Element,
  phase: ChartMotionPhase,
  scene: ChartScene,
): ChartMotionContext | undefined {
  const key = element.getAttribute('data-ts-key')
  if (!key) return undefined

  const focusGuide = element.closest<SVGGElement>('g.ts-chart__crosshair')
  if (focusGuide) {
    const ownerKey = focusGuide.getAttribute('data-ts-key') ?? key
    const markId = motionMarkId(scene, ownerKey)
    return {
      phase,
      role: markMotionRole(focusGuide, element),
      key,
      markId,
      seriesKey: ownerKey,
      seriesIndex: 0,
      datumIndex: 0,
      datumCount: 1,
      datum: undefined,
      point: undefined,
    }
  }

  const presentationFocusLayer = element.closest<SVGGElement>(
    'g.ts-chart__focus-layer',
  )
  if (
    presentationFocusLayer &&
    !presentationFocusLayer.hasAttribute('data-ts-focus-retarget')
  ) {
    const focusPoints = collectMotionFocusLayers(scene.nodes).flatMap(
      (layer) => layer.focus?.points ?? [],
    )
    const point = focusPoints.find(
      (candidate) => candidate.key === key || key === `${candidate.key}:dot`,
    )
    if (!point) return undefined
    const markPoints = focusPoints.filter(
      (candidate) => candidate.markId === point.markId,
    )
    return {
      phase,
      role: markMotionRole(presentationFocusLayer, element),
      key,
      markId: point.markId,
      seriesKey: `${point.markId}:${motionGroupIdentity(point)}`,
      seriesIndex: 0,
      datumIndex: point.datumIndex,
      datumCount: Math.max(1, markPoints.length),
      datum: point.datum,
      point,
    }
  }

  const axes = element.closest<SVGGElement>('g.ts-chart__axes')
  const grid = element.closest<SVGGElement>('g.ts-chart__grid')
  const axis = key.startsWith('x-')
    ? 'x'
    : key.startsWith('y-')
      ? 'y'
      : undefined
  if (axis && (axes || grid)) {
    const role: ChartMotionRole = grid
      ? 'grid'
      : key === `${axis}-axis`
        ? 'axis'
        : key.startsWith(`${axis}-tick-rule:`)
          ? 'tick'
          : key.startsWith(`${axis}-tick-label:`)
            ? 'tick-label'
            : key === `${axis}-label`
              ? 'axis-label'
              : 'axis'
    const parent = grid ?? axes
    const prefix =
      role === 'grid'
        ? `${axis}-grid:`
        : role === 'tick'
          ? `${axis}-tick-rule:`
          : role === 'tick-label'
            ? `${axis}-tick-label:`
            : key
    const peers = parent
      ? [...parent.querySelectorAll<Element>('[data-ts-key]')].filter(
          (candidate) =>
            candidate.getAttribute('data-ts-key')?.startsWith(prefix) ?? false,
        )
      : [element]
    return {
      phase,
      role,
      key,
      axis,
      seriesKey: `${role}:${axis}`,
      seriesIndex: axis === 'x' ? 0 : 1,
      datumIndex: Math.max(0, peers.indexOf(element)),
      datumCount: Math.max(1, peers.length),
      datum: undefined,
      point: undefined,
    }
  }

  const marks = element.closest<SVGGElement>('g.ts-chart__marks')
  if (!marks) return undefined
  const focusLayer = element.closest<SVGGElement>('g.ts-chart__focus-layer')
  if (focusLayer && !focusLayer.hasAttribute('data-ts-focus-retarget')) {
    return undefined
  }
  const focusContext = focusLayer
    ? retargetFocusContext(element, focusLayer, scene)
    : undefined
  const point = focusContext?.point ?? motionPointForKey(scene.points, key)
  let owner = element
  const ownerParent = focusLayer ?? marks
  while (owner.parentElement && owner.parentNode !== ownerParent) {
    owner = owner.parentElement
  }
  const ownerKey = owner.getAttribute('data-ts-key') ?? key
  const markId = point?.markId ?? motionMarkId(scene, ownerKey)
  const role = markMotionRole(owner, element)
  const markPoints = markId
    ? (focusContext?.layer.focus?.points ?? scene.points).filter(
        (candidate) => candidate.markId === markId,
      )
    : []
  const seriesKey = point
    ? `${point.markId}:${String(point.group ?? '')}`
    : ownerKey
  return {
    phase,
    role,
    key,
    markId,
    seriesKey,
    seriesIndex: 0,
    datumIndex: point?.datumIndex ?? 0,
    datumCount: Math.max(1, markPoints.length),
    datum: point?.datum,
    point,
  }
}

function retargetFocusContext(
  element: Element,
  focusLayer: SVGGElement,
  scene: ChartScene,
): { layer: SceneGroup; point: ChartPoint | undefined } | undefined {
  const layerKey = focusLayer.getAttribute('data-ts-key')
  if (!layerKey) return undefined
  const layer = findSceneGroup(scene.nodes, layerKey)
  if (!layer?.focus?.retarget) return undefined
  const prefix = `${layerKey}:selection:`
  let current: Element | null = element
  let slot: number | undefined
  while (current && current !== focusLayer) {
    const key = current.getAttribute('data-ts-key')
    if (key?.startsWith(prefix)) {
      const value = Number(key.slice(prefix.length).split(':')[0])
      if (Number.isInteger(value) && value >= 0) slot = value
      break
    }
    current = current.parentElement
  }
  return {
    layer,
    point: layer.focus.activePoints?.[slot ?? 0],
  }
}

function findSceneGroup(
  nodes: readonly ChartScene['nodes'][number][],
  key: string,
): SceneGroup | undefined {
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.key === key) return node
    const nested = findSceneGroup(node.children, key)
    if (nested) return nested
  }
  return undefined
}

function motionPointForKey(
  points: readonly ChartPoint[],
  key: string,
): ChartPoint | undefined {
  let match: ChartPoint | undefined
  for (const point of points) {
    if (
      key !== point.key &&
      key !== `${point.key}:dot` &&
      !key.startsWith(`${point.key}:`)
    ) {
      continue
    }
    if (!match || point.key.length > match.key.length) match = point
  }
  return match
}

function markMotionRole(owner: Element, element: Element): ChartMotionRole {
  let className = ''
  let current: Element | null = element
  while (current) {
    className += ` ${current.getAttribute('class') ?? ''}`
    if (current === owner) break
    current = current.parentElement
  }
  if (
    className.includes('ts-chart__area') ||
    className.includes('ts-chart__radial-area')
  )
    return 'area'
  // Radial bars also carry the arc geometry role for inspection. Keep the
  // authored mark role semantic when both classes are present.
  if (className.includes('ts-chart__bar')) return 'bar'
  if (className.includes('ts-chart__arc')) return 'arc'
  if (className.includes('ts-chart__arrow')) return 'arrow'
  if (className.includes('ts-chart__band')) return 'band'
  if (className.includes('ts-chart__dot')) return 'dot'
  if (className.includes('ts-chart__facet')) return 'facet'
  if (className.includes('ts-chart__frame')) return 'frame'
  if (className.includes('ts-chart__geo')) return 'geo'
  if (className.includes('ts-chart__hexagon')) return 'hexagon'
  if (className.includes('ts-chart__line')) return 'line'
  if (className.includes('ts-chart__link')) return 'link'
  if (className.includes('ts-chart__text')) return 'text'
  if (className.includes('ts-chart__rect')) return 'rect'
  if (className.includes('ts-chart__rule')) return 'rule'
  if (className.includes('ts-chart__tick')) return 'tick'
  if (className.includes('ts-chart__vector')) return 'vector'
  if (element.localName === 'circle') return 'dot'
  if (element.localName === 'text') return 'text'
  if (element.localName === 'rect') return 'rect'
  if (element.localName === 'line') return 'rule'
  if (element.localName === 'path') return 'area'
  return 'mark'
}

function motionMarkId(scene: ChartScene, key: string): string | undefined {
  const focusGuide = scene.focusGuides
    ?.slice()
    .sort((left, right) => right.key.length - left.key.length)
    .find((guide) => key === guide.key || key.startsWith(`${guide.key}:`))
  if (focusGuide) return focusGuide.markId
  const source = motionSceneSource(scene)
  const candidates = new Set([
    ...scene.points.map((point) => point.markId),
    ...(source?.[1].map((mark) => mark.id) ?? []),
  ])
  return [...candidates]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => key === candidate || key.startsWith(`${candidate}:`))
}

function createPresentationTracks(
  root: SVGSVGElement,
  scene: ChartScene,
  fromPoints: readonly ChartPoint[],
  timingFor: TimingResolver,
  setPresentationPoints: ((points: readonly ChartPoint[]) => void) | undefined,
  defaultPhase: 'enter' | 'update',
  runtime: MotionRuntime,
  rollingPlans?: RollingPathPlans,
) {
  const verticalBars = keyedElements(root, 'g.ts-chart__bar-y > rect')
  const horizontalBars = keyedElements(root, 'g.ts-chart__bar-x > rect')
  const pathGroups = keyedElementMap(
    root,
    'g.ts-chart__line, g.ts-chart__area, g.ts-chart__radial-area',
  )
  const elements = keyedElementMap(root, '[data-ts-key]')
  const targetByIdentity = new Map(
    scene.points.map((point) => [pointIdentity(point), point]),
  )
  const fromByIdentity = new Map(
    fromPoints.map((point) => [pointIdentity(point), point]),
  )
  const presented = new Map(
    fromPoints.map((point) => [pointIdentity(point), point]),
  )
  const tracks: MotionTrack[] = []
  const series = [...new Set(scene.points.map((point) => point.markId))]
  const counts = new Map<string, number>()
  for (const point of scene.points) {
    counts.set(point.markId, (counts.get(point.markId) ?? 0) + 1)
  }

  for (const point of scene.points) {
    const identity = pointIdentity(point)
    const previous = fromByIdentity.get(identity)
    const vertical = verticalBars.has(point.key)
    const horizontal = horizontalBars.has(point.key)
    if (!vertical && !horizontal) {
      const rolling = rollingPlans?.points.get(identity)
      if (rolling?.outcome.kind === 'transform') {
        const transform = rolling.outcome.transform
        presented.set(identity, {
          ...point,
          x: point.x + transform.x,
          y: point.y * transform.yScale + transform.y,
        })
        continue
      }
      if (
        rolling?.outcome.kind === 'fallback' &&
        rolling.outcome.fallback === 'snap'
      ) {
        presented.set(identity, point)
        continue
      }
      if (seriesElementForPoint(point, pathGroups)) {
        presented.set(
          identity,
          previous ? { ...point, x: previous.x, y: previous.y } : point,
        )
        continue
      }
      if (!previous || (previous.x === point.x && previous.y === point.y)) {
        presented.set(identity, point)
        continue
      }
      const element =
        elements.get(point.key) ?? elements.get(`${point.key}:dot`)
      const context = element
        ? elementTimingContext(element, 'update', scene)
        : undefined
      if (!context) {
        presented.set(identity, point)
        continue
      }
      presented.set(identity, { ...point, x: previous.x, y: previous.y })
      const states = pointValueStates(runtime, identity, [
        previous.x,
        previous.y,
      ])
      tracks.push({
        ...timingFor(context),
        values: bindMotionValues(
          states,
          [previous.x, previous.y],
          [point.x, point.y],
        ),
        apply(values) {
          presented.set(identity, {
            ...point,
            x: values[0] ?? point.x,
            y: values[1] ?? point.y,
          })
        },
        finish() {
          presented.set(identity, point)
        },
      })
      continue
    }
    const phase: ChartMotionPhase = previous ? 'update' : 'enter'
    const baseline = resolveBarBaseline(
      scene,
      point,
      horizontal,
      horizontal ? point.x : point.y,
    )
    const start =
      previous ??
      (horizontal ? { ...point, x: baseline } : { ...point, y: baseline })
    presented.set(identity, { ...point, x: start.x, y: start.y })
    const timing = timingFor({
      phase: defaultPhase === 'enter' ? 'enter' : phase,
      role: 'bar',
      key: point.key,
      markId: point.markId,
      seriesKey: point.markId,
      seriesIndex: Math.max(0, series.indexOf(point.markId)),
      datumIndex: point.datumIndex,
      datumCount: counts.get(point.markId) ?? 1,
      datum: point.datum,
      point,
    })
    const states = pointValueStates(runtime, identity, [start.x, start.y])
    tracks.push({
      ...timing,
      values: bindMotionValues(states, [start.x, start.y], [point.x, point.y]),
      apply(values) {
        presented.set(identity, {
          ...point,
          x: values[0] ?? point.x,
          y: values[1] ?? point.y,
        })
      },
      finish() {
        presented.set(identity, point)
      },
    })
  }

  if (rollingPlans) {
    for (const planned of rollingPlans.elements.values()) {
      if (planned.outcome.kind !== 'transform') continue
      const transform = planned.outcome.transform
      const exiting = planned.previousPoints.flatMap((point) => {
        const identity = pointIdentity(point)
        if (targetByIdentity.has(identity)) return []
        const start = fromByIdentity.get(identity) ?? point
        return [
          {
            identity,
            point,
            state: runtime.points.get(identity),
            target: {
              x: start.x - transform.x,
              y: (start.y - transform.y) / transform.yScale,
            },
          },
        ]
      })
      const from = [transform.x, transform.yScale, transform.y]
      const apply = (values: readonly number[]) => {
        for (const point of planned.points) {
          const x = point.x + (values[0] ?? 0)
          const y = point.y * (values[1] ?? 1) + (values[2] ?? 0)
          presented.set(pointIdentity(point), { ...point, x, y })
        }
        for (const entry of exiting) {
          const x = entry.target.x + (values[0] ?? 0)
          const y = entry.target.y * (values[1] ?? 1) + (values[2] ?? 0)
          presented.set(entry.identity, { ...entry.point, x, y })
        }
      }
      apply(from)
      const cleanupExiting = () => {
        for (const entry of exiting) {
          presented.delete(entry.identity)
          if (runtime.points.get(entry.identity) === entry.state) {
            runtime.points.delete(entry.identity)
          }
        }
      }
      tracks.push({
        ...planned.timing,
        values: bindMotionValues(undefined, from, [0, 1, 0]),
        apply,
        finish() {
          for (const point of planned.points) {
            presented.set(pointIdentity(point), point)
          }
          cleanupExiting()
        },
        cancel: cleanupExiting,
      })
    }
  }

  const pathSeries = new Map<string, ChartPoint[]>()
  for (const point of scene.points) {
    if (verticalBars.has(point.key) || horizontalBars.has(point.key)) continue
    const rolling = rollingPlans?.points.get(pointIdentity(point))
    if (
      rolling?.outcome.kind === 'transform' ||
      (rolling?.outcome.kind === 'fallback' &&
        rolling.outcome.fallback === 'snap')
    ) {
      continue
    }
    const pathSeriesEntry = seriesElementForPoint(point, pathGroups)
    if (!pathSeriesEntry) continue
    const seriesKey = pathSeriesEntry[0]
    const points = pathSeries.get(seriesKey)
    if (points) points.push(point)
    else pathSeries.set(seriesKey, [point])
  }
  for (const [seriesKey, points] of pathSeries) {
    const previous = points.map((point) =>
      fromByIdentity.get(pointIdentity(point)),
    )
    const group = pathGroups.get(seriesKey)
    const role = group ? markMotionRole(group, group) : 'line'
    const timing = timingFor({
      phase:
        defaultPhase === 'enter'
          ? 'enter'
          : previous.some(Boolean)
            ? 'update'
            : 'enter',
      role,
      key: seriesKey,
      markId: points[0]?.markId ?? motionMarkId(scene, seriesKey),
      seriesKey,
      seriesIndex: Math.max(0, series.indexOf(seriesKey)),
      datumIndex: 0,
      datumCount: points.length,
      datum: undefined,
      point: undefined,
    })
    const from: number[] = []
    const to: number[] = []
    const states: MotionValueState[] = []
    points.forEach((point, index) => {
      const start = previous[index] ?? point
      from.push(start.x, start.y)
      to.push(point.x, point.y)
      states.push(
        ...pointValueStates(runtime, pointIdentity(point), [start.x, start.y]),
      )
    })
    tracks.push({
      ...timing,
      values: bindMotionValues(states, from, to),
      apply(values) {
        points.forEach((point, index) => {
          presented.set(pointIdentity(point), {
            ...point,
            x: values[index * 2] ?? point.x,
            y: values[index * 2 + 1] ?? point.y,
          })
        })
      },
      finish() {
        points.forEach((point) => presented.set(pointIdentity(point), point))
      },
    })
  }

  for (const point of fromPoints) {
    const identity = pointIdentity(point)
    if (targetByIdentity.has(identity)) continue
    const rolling = rollingPlans?.points.get(identity)
    if (rolling?.outcome.kind === 'transform') continue
    if (
      rolling?.outcome.kind === 'fallback' &&
      rolling.outcome.fallback === 'snap'
    ) {
      presented.delete(identity)
      runtime.points.delete(identity)
      continue
    }
    const element = elements.get(point.key) ?? elements.get(`${point.key}:dot`)
    const pathSeriesEntry = seriesElementForPoint(point, pathGroups)
    const role: ChartMotionRole =
      verticalBars.has(point.key) || horizontalBars.has(point.key)
        ? 'bar'
        : pathSeriesEntry
          ? markMotionRole(pathSeriesEntry[1], pathSeriesEntry[1])
          : element
            ? markMotionRole(element, element)
            : 'mark'
    const state = runtime.points.get(identity)
    const cleanup = () => {
      presented.delete(identity)
      if (runtime.points.get(identity) === state) {
        runtime.points.delete(identity)
      }
    }
    tracks.push({
      ...timingFor({
        phase: 'exit',
        role,
        key: point.key,
        markId: point.markId,
        seriesKey: point.markId,
        seriesIndex: Math.max(0, series.indexOf(point.markId)),
        datumIndex: point.datumIndex,
        datumCount: 1,
        datum: point.datum,
        point,
      }),
      values: bindMotionValues(undefined, [0], [1]),
      apply() {},
      finish: cleanup,
      cancel: cleanup,
    })
  }

  const publish = () => setPresentationPoints?.([...presented.values()])
  publish()
  return { tracks, publish }
}

function keyedElements(root: SVGSVGElement, selector: string) {
  return new Set(keyedElementMap(root, selector).keys())
}

function keyedElementMap(root: ParentNode, selector: string) {
  const result = new Map<string, Element>()
  for (const element of root.querySelectorAll(selector)) {
    const key = element.getAttribute('data-ts-key')
    if (key && !result.has(key)) result.set(key, element)
  }
  return result
}

function pointIdentity(point: ChartPoint) {
  return `${point.markId}\0${point.key}`
}

function motionGroupIdentity(point: ChartPoint) {
  return valueKey(point.group)
}

function seriesElementForPoint(
  point: ChartPoint,
  series: ReadonlyMap<string, Element>,
) {
  const entries = [...series.entries()]
  const keyed = entries
    .filter(([key]) => point.key === key || point.key.startsWith(`${key}:`))
    .sort(([left], [right]) => right.length - left.length)[0]
  if (keyed) return keyed
  return entries
    .filter(
      ([key]) => key === point.markId || key.startsWith(`${point.markId}:`),
    )
    .sort(([left], [right]) => right.length - left.length)[0]
}

function finishMotionAttributes(
  element: Element,
  attributes: readonly MotionAttribute[],
) {
  for (const attribute of attributes) {
    if (attribute.target === null) element.removeAttribute(attribute.name)
    else element.setAttribute(attribute.name, attribute.target)
  }
}

function parseMotionAttribute(previous: string, next: string) {
  const from = extractMotionNumbers(previous)
  const to = extractMotionNumbers(next)
  if (
    from.skeleton !== to.skeleton ||
    from.values.length !== to.values.length ||
    !from.values.length
  ) {
    return undefined
  }
  return { skeleton: to.skeleton, from: from.values, to: to.values }
}

function formatMotionAttribute(skeleton: string, values: readonly number[]) {
  let index = 0
  return skeleton.replaceAll('#', () => formatNumber(values[index++] ?? 0))
}

function extractMotionNumbers(value: string) {
  const values: number[] = []
  const skeleton = value.replace(
    /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi,
    (match) => {
      values.push(Number(match))
      return '#'
    },
  )
  return { skeleton, values }
}

function elementValueStates(
  runtime: MotionRuntime,
  element: Element,
  name: string,
  values: readonly number[],
) {
  let attributes = runtime.elements.get(element)
  if (!attributes) {
    attributes = new Map()
    runtime.elements.set(element, attributes)
  }
  let states = attributes.get(name)
  if (!states || states.length !== values.length) {
    states = values.map((value) => ({ value, velocity: 0 }))
    attributes.set(name, states)
  }
  return states
}

function pointValueStates(
  runtime: MotionRuntime,
  key: string,
  values: readonly number[],
) {
  let states = runtime.points.get(key)
  if (!states || states.length !== values.length) {
    states = values.map((value) => ({ value, velocity: 0 }))
    runtime.points.set(key, states)
  }
  return states
}

function bindMotionValues(
  states: readonly MotionValueState[] | undefined,
  from: readonly number[],
  to: readonly number[],
): MotionValueBinding[] {
  return to.map((target, index) => {
    const source = from[index] ?? target
    const state = states?.[index] ?? { value: source, velocity: 0 }
    if (
      !Number.isFinite(state.value) ||
      Math.abs(state.value - source) > 0.002
    ) {
      state.value = source
      state.velocity = 0
    }
    return {
      state,
      from: state.value,
      to: target,
      velocity: state.velocity,
    }
  })
}

function indexMotionChildren(children: readonly Element[]) {
  const result = new Map<string, Element>()
  motionIdentities(children).forEach((identity, index) => {
    const child = children[index]
    if (child) result.set(identity, child)
  })
  return result
}

function motionIdentities(children: readonly Element[]) {
  const counts = new Map<string, number>()
  return children.map((child) => {
    const key = child.getAttribute('data-ts-key')
    if (key) return `key:${key}`
    const count = counts.get(child.localName) ?? 0
    counts.set(child.localName, count + 1)
    return `tag:${child.localName}:${count}`
  })
}

function resolveTiming(
  options: ResolvedMotionOptions,
  context: ChartMotionContext,
  definitions?: SceneMotionDefinitions,
  overrides?: SceneMotionDefinitions,
) {
  const baseDuration =
    options.transition.type === 'tween'
      ? options.transition.duration
      : defaultDuration
  const automaticDelay =
    context.role === 'bar' && context.phase === 'enter'
      ? (baseDuration * defaultStaggerRatio * context.datumIndex) /
        Math.max(1, context.datumCount)
      : 0
  let delay = automaticDelay
  let transition = options.transition
  let path: ChartMotionPath = 'morph'
  const apply = (definition: ChartMotionDefinition<any> | undefined) => {
    const authored =
      typeof definition === 'function' ? definition(context) : definition
    if (!authored) return
    if (authored.delay !== undefined) delay = nonNegative(authored.delay, delay)
    if (authored.path !== undefined) path = authored.path
    transition = resolveTransition(
      authored.transition,
      transition.type === 'tween' ? transition.duration : defaultDuration,
      undefined,
      transition,
    )
  }

  apply(definitions?.default)
  if (context.markId && definitions?.marks) {
    const markId = Object.keys(definitions.marks)
      .filter(
        (candidate) =>
          context.markId === candidate ||
          context.markId?.startsWith(`${candidate}:`),
      )
      .sort((left, right) => right.length - left.length)[0]
    if (markId) apply(definitions.marks[markId])
  }
  if (context.axis) {
    apply(definitions?.guides?.[`axis:${context.axis}`])
    if (context.role !== 'axis') {
      apply(definitions?.guides?.[`${context.role}:${context.axis}`])
    }
  }
  apply(overrides?.default)
  if (context.markId && overrides?.marks) {
    const markId = Object.keys(overrides.marks)
      .filter(
        (candidate) =>
          context.markId === candidate ||
          context.markId?.startsWith(`${candidate}:`),
      )
      .sort((left, right) => right.length - left.length)[0]
    if (markId) apply(overrides.marks[markId])
  }

  // A delayed physical retarget would freeze the sampled velocity. Spring
  // updates therefore begin immediately; use delay for enter/exit choreography.
  if (context.phase === 'update' && transition.type === 'spring') delay = 0
  return { delay, transition, path }
}

function createTimingResolver(
  options: ResolvedMotionOptions,
  scene: ChartScene,
  overrides?: SceneMotionDefinitions,
): TimingResolver {
  const definitions = motionDefinitions(scene)
  const cache = new Map<string, ResolvedTiming>()
  return (context) => {
    const key = `${context.phase}\0${context.role}\0${context.key}`
    const existing = cache.get(key)
    if (existing) return existing
    const timing = resolveTiming(options, context, definitions, overrides)
    cache.set(key, timing)
    return timing
  }
}

function motionDefinitions(
  scene: ChartScene,
): SceneMotionDefinitions | undefined {
  const source = motionSceneSource(scene)
  const marks: Record<string, ChartMotionDefinition<any>> = {}
  let defaultDefinition: ChartMotionDefinition<any> | undefined
  if (source) {
    const [definition, initialized] = source
    defaultDefinition = definition.motion
    initialized.forEach((mark, index) => {
      const authored = mark.motion ?? definition.marks[index]?.motion
      if (authored !== undefined) marks[mark.id] = authored
    })
  }
  for (const guide of scene.focusGuides ?? []) {
    if (guide.motion !== undefined) {
      marks[guide.markId] = guide.motion as ChartMotionDefinition<any>
    }
  }

  const guides: Record<string, ChartMotionDefinition<any>> = {}
  if (source) {
    const [definition] = source
    for (const axis of ['x', 'y'] as const) {
      const configured = definition[axis]
      const presentation =
        !configured || configured.axis === false
          ? undefined
          : (configured.axis ?? {})
      if (presentation?.motion !== undefined) {
        guides[`axis:${axis}`] = presentation.motion
      }
      if (presentation?.ticks && presentation.ticks.motion !== undefined) {
        guides[`tick:${axis}`] = presentation.ticks.motion
      }
      if (
        presentation?.tickLabels &&
        presentation.tickLabels.motion !== undefined
      ) {
        guides[`tick-label:${axis}`] = presentation.tickLabels.motion
      }
      if (
        typeof presentation?.label === 'object' &&
        presentation.label.motion !== undefined
      ) {
        guides[`axis-label:${axis}`] = presentation.label.motion
      }
    }
  }

  const hasMarks = Object.keys(marks).length > 0
  const hasGuides = Object.keys(guides).length > 0
  if (defaultDefinition === undefined && !hasMarks && !hasGuides) {
    return undefined
  }
  return {
    ...(defaultDefinition === undefined ? {} : { default: defaultDefinition }),
    ...(hasMarks ? { marks } : {}),
    ...(hasGuides ? { guides } : {}),
  }
}

function motionSceneSource(scene: ChartScene): SceneMotionSource | undefined {
  return (
    scene as ChartScene & {
      [chartSceneSource]?: SceneMotionSource
    }
  )[chartSceneSource]
}

function resolveBarBaseline(
  scene: ChartScene,
  point: ChartPoint | undefined,
  horizontal: boolean,
  fallback: number,
) {
  const scale = scene.scales[horizontal ? 'x' : 'y']
  const value = horizontal ? point?.x1Value : point?.y1Value
  if (!scale || value === undefined) return fallback
  const baseline = scale.map(value)
  return Number.isFinite(baseline) ? baseline : fallback
}

function runTracks(
  root: SVGElement,
  tracks: readonly MotionTrack[],
  lifecycle: { publish?: () => void; finish?: () => void } = {},
) {
  if (!tracks.length) {
    lifecycle.finish?.()
    return () => {}
  }
  const view = root.ownerDocument.defaultView
  const requestFrame = view?.requestAnimationFrame?.bind(view)
  const cancelFrame = view?.cancelAnimationFrame?.bind(view)
  if (!requestFrame || !cancelFrame) {
    tracks.forEach(completeMotionTrack)
    lifecycle.finish?.()
    return () => {}
  }

  const safetyLimit = Math.max(
    ...tracks.map(
      (track) =>
        track.delay +
        (track.transition.type === 'tween'
          ? track.transition.duration
          : springSafetyLimit),
    ),
  )
  if (safetyLimit <= 0) {
    tracks.forEach(completeMotionTrack)
    lifecycle.finish?.()
    return () => {}
  }

  let frame = 0
  let start: number | undefined
  let cancelled = false
  const finished = new Set<MotionTrack>()
  root.dataset.tsMotionState = 'running'
  root.dataset.tsMotionProgress = '0'

  const tick = (time: number) => {
    if (cancelled) return
    start ??= time
    const elapsed = time - start
    for (const track of tracks) {
      if (finished.has(track)) continue
      if (sampleMotionTrack(track, elapsed)) {
        completeMotionTrack(track)
        finished.add(track)
      }
    }
    lifecycle.publish?.()
    root.dataset.tsMotionProgress = String(finished.size / tracks.length)
    if (finished.size < tracks.length && elapsed < safetyLimit) {
      frame = requestFrame(tick)
      return
    }
    for (const track of tracks) {
      if (!finished.has(track)) completeMotionTrack(track)
    }
    lifecycle.finish?.()
    root.dataset.tsMotionState = 'finished'
    root.dataset.tsMotionProgress = '1'
  }
  frame = requestFrame(tick)

  return () => {
    if (cancelled) return
    cancelled = true
    cancelFrame(frame)
    tracks.forEach((track) => {
      if (!finished.has(track)) track.cancel?.()
    })
    lifecycle.publish?.()
    root.dataset.tsMotionState = 'cancelled'
  }
}

function sampleMotionTrack(track: MotionTrack, elapsed: number) {
  const localElapsed = elapsed - track.delay
  if (localElapsed < 0) {
    track.apply(track.values.map((binding) => binding.state.value))
    return false
  }

  if (track.transition.type === 'tween') {
    const duration = track.transition.duration
    if (duration <= 0) return true
    const progress = Math.max(0, Math.min(1, localElapsed / duration))
    const eased = track.transition.easing(progress)
    const slope = easingSlope(track.transition.easing, progress)
    const seconds = duration / 1_000
    const values = track.values.map((binding) => {
      const delta = binding.to - binding.from
      binding.state.value = binding.from + delta * eased
      binding.state.velocity = progress >= 1 ? 0 : (delta * slope) / seconds
      return binding.state.value
    })
    track.apply(values)
    return progress >= 1
  }

  let done = true
  const spring = track.transition.spring
  const values = track.values.map((binding) => {
    const sample = spring.sample(localElapsed, {
      from: binding.from,
      to: binding.to,
      velocity: binding.velocity,
    })
    binding.state.value = sample.value
    binding.state.velocity = sample.velocity
    done &&= sample.done
    return sample.value
  })
  track.apply(values)
  return done || localElapsed >= springSafetyLimit
}

function completeMotionTrack(track: MotionTrack) {
  const values = track.values.map((binding) => {
    binding.state.value = binding.to
    binding.state.velocity = 0
    return binding.to
  })
  track.apply(values)
  track.finish()
}

function easingSlope(easing: (progress: number) => number, progress: number) {
  const step = 1e-4
  const before = Math.max(0, progress - step)
  const after = Math.min(1, progress + step)
  if (after === before) return 0
  return (easing(after) - easing(before)) / (after - before)
}

function resolveTransition(
  transition: ChartMotionTransition | undefined,
  fallbackDuration: number,
  fallbackEasing?: ChartMotionTweenTransition['easing'],
  fallback?: ResolvedTransition,
): ResolvedTransition {
  if (!transition && fallback) return fallback
  if (transition?.type === 'spring') {
    const {
      type: _type,
      respectReducedMotion: _reduced,
      ...options
    } = transition as ChartMotionSpringTransition & {
      respectReducedMotion?: boolean
    }
    return {
      type: 'spring',
      spring: createChartSpring({
        ...(fallback?.type === 'spring' ? fallback.spring.options : {}),
        ...options,
      }),
    }
  }
  return {
    type: 'tween',
    duration: nonNegative(
      transition?.duration,
      fallback?.type === 'tween' ? fallback.duration : fallbackDuration,
    ),
    easing:
      transition?.easing === undefined && fallback?.type === 'tween'
        ? fallback.easing
        : resolveEasing(transition?.easing ?? fallbackEasing),
  }
}

function resolveEasing(
  easing: ChartMotionTweenTransition['easing'] | undefined,
): (progress: number) => number {
  if (typeof easing === 'function') return easing
  switch (easing) {
    case 'linear':
      return (progress) => progress
    case 'ease-in':
      return (progress) => progress * progress
    case 'ease-in-out':
      return (progress) =>
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
    case 'ease':
      return cubicBezier(0.25, 0.1, 0.25, 1)
    case 'ease-out':
      return (progress) => 1 - (1 - progress) * (1 - progress)
    default:
      return defaultEasing
  }
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sample = (time: number, first: number, second: number) => {
    const inverse = 1 - time
    return (
      3 * inverse * inverse * time * first +
      3 * inverse * time * time * second +
      time * time * time
    )
  }
  return (progress: number) => {
    let low = 0
    let high = 1
    let time = progress
    for (let iteration = 0; iteration < 12; iteration++) {
      time = (low + high) / 2
      if (sample(time, x1, x2) < progress) low = time
      else high = time
    }
    return sample(time, y1, y2)
  }
}

function numberAttribute(element: Element, name: string) {
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) ? value : 0
}

function nonNegative(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, value!) : fallback
}

function formatNumber(value: number) {
  return String(Math.round(value * 1_000) / 1_000)
}
