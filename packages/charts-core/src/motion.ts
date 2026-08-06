import { focusedNodeKeys, resolveFocusScene } from './focus-layer'
import { resolveMarkStateScene } from './mark-state'
import { reconcileChartSvg } from './reconcile'
import { chartSceneSource } from './scene-source'
import { createChartSpring } from './spring'
import { renderChartSvg } from './svg'
import type {
  ChartRenderer,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type {
  ChartFocusState,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
  ChartMotionRole,
  ChartMotionSpringTransition,
  ChartMotionTiming,
  ChartMotionTransition,
  ChartMotionTweenTransition,
  ChartMarkStateTransition,
  ChartPoint,
  ChartScene,
  ChartSvgRenderer,
  ChartValue,
  InitializedMark,
  SceneGroup,
  StaticChartDefinition,
} from './types'
import type { ChartSpring } from './spring'

export type {
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
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

interface ChartSvgMotionDriver<TDatum = unknown> {
  readonly id: string
  readonly initial: boolean
  readonly resize: boolean
  readonly respectReducedMotion: boolean
  animateSvg: (context: ChartSvgMotionContext<TDatum>) => () => void
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

type ResolvedTiming = Pick<MotionTrack, 'delay' | 'transition'>
type TimingResolver = (context: ChartMotionContext) => ResolvedTiming

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
  }
}

export function motion<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(options: ChartMotionOptions = {}): ChartRenderer<TDatum, TXValue, TYValue> {
  return createMotionSvgChartRenderer<TDatum, TXValue, TYValue>(
    createSvgMotionDriver(options),
    renderChartSvg,
  )
}

function createMotionSvgChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  motion: ChartSvgMotionDriver<TDatum>,
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue> = renderChartSvg,
): ChartRenderer<TDatum, TXValue, TYValue> {
  const renderer: ChartRenderer<TDatum, TXValue, TYValue> = {
    id: `svg:${motion.id}`,
    prerender: renderSvg,
    mount(container) {
      const adoptedRoot =
        container.firstElementChild?.matches('svg.ts-chart') ?? false
      let cancelAnimation = () => {}
      let scene: ChartScene<TDatum, TXValue, TYValue> | undefined
      let presentationPoints:
        readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined
      let renderOptions: ChartSurfaceRenderOptions | undefined
      let stateTransition: ChartMarkStateTransition | undefined
      let stateTransitions:
        Readonly<Record<string, ChartMarkStateTransition>> | undefined
      let stateScene: ChartScene<TDatum, TXValue, TYValue> | undefined
      const svgElement = () => {
        const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!svg) {
          throw new Error(
            'The motion SVG renderer must produce an svg.ts-chart root element.',
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
          const previousScene = scene
          const previousPresentation =
            presentationPoints ?? previousScene?.points ?? []
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
          const markup = renderSvg(nextScene, options)
          cancelAnimation()
          if (animate) {
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
                presentationPoints = points as readonly ChartPoint<
                  TDatum,
                  TXValue,
                  TYValue
                >[]
              },
            })
          } else {
            reconcileChartSvg(container, markup)
            presentationPoints = nextScene.points
          }
          scene = nextScene
          stateScene = undefined
          renderOptions = options
          stateTransition = undefined
          stateTransitions = undefined
        },
        clientToScene(currentScene, clientX, clientY) {
          return motionClientToScene(
            svgElement(),
            currentScene,
            clientX,
            clientY,
          )
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
        paintFocus(focus, pointer) {
          if (!scene || !renderOptions) return
          const state = resolveMarkStateScene(scene, focus, pointer)
          const resolved = resolveFocusScene(state.scene, focus)
          const previousTransition = stateTransition
          const previousTransitions = stateTransitions
          if (resolved.scene !== scene || stateScene || previousTransition) {
            cancelAnimation()
            presentationPoints = scene.points
            const transition = state.transition ?? previousTransition
            const reduced =
              motion.respectReducedMotion &&
              (transition?.respectReducedMotion ?? true) &&
              (container.ownerDocument.defaultView?.matchMedia?.(
                '(prefers-reduced-motion: reduce)',
              ).matches ??
                false)
            const markup = renderSvg(resolved.scene, renderOptions)
            cancelAnimation = reduced
              ? reconcileChartSvg(container, markup)
              : motion.animateSvg({
                  container,
                  scene: resolved.scene as ChartScene<TDatum>,
                  previousScene: (stateScene ?? scene) as ChartScene<TDatum>,
                  presentationPoints: scene.points,
                  markup,
                  phase: 'update',
                  markTransitions: state.transitions ?? previousTransitions,
                })
            stateScene =
              focus && resolved.scene !== scene ? resolved.scene : undefined
          }
          stateTransition = focus
            ? (state.transition ?? previousTransition)
            : undefined
          stateTransitions = focus
            ? (state.transitions ?? previousTransitions)
            : undefined
          paintMotionSvgFocus(svgElement(), resolved.scene, focus)
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

function motionClientToScene(
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

function paintMotionSvgFocus(
  svg: SVGSVGElement,
  scene: ChartScene,
  focus: ChartFocusState | null,
) {
  const sceneLayers = collectMotionFocusLayers(scene.nodes)
  const elements = svg.querySelectorAll<SVGGElement>('[data-ts-focus-layer]')
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
  reconcileMotionElement(currentRoot, nextRoot, tracks, {
    scene: context.scene,
    previousScene: context.previousScene,
    timingFor,
    options,
    runtime,
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
  const nextNames = new Set(next.getAttributeNames())
  for (const name of current.getAttributeNames()) {
    if (!nextNames.has(name)) current.removeAttribute(name)
  }

  const attributes: MotionAttribute[] = []
  for (const name of nextNames) {
    const target = next.getAttribute(name)
    const previous = current.getAttribute(name)
    if (target === previous) continue
    const parsed =
      previous !== null && target !== null && motionAttributes.has(name)
        ? parseMotionAttribute(previous, target)
        : undefined
    if (parsed) attributes.push({ name, ...parsed, target })
    else if (target !== null) current.setAttribute(name, target)
  }
  if (!attributes.length) return

  const timingContext = elementTimingContext(current, 'update', context.scene)
  if (!timingContext) {
    finishMotionAttributes(current, attributes)
    return
  }
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
    ...context.timingFor(timingContext),
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

function addEnterMotionTrack(
  element: Element,
  tracks: MotionTrack[],
  context: MotionReconcileContext,
) {
  const timingContext = elementTimingContext(element, 'enter', context.scene)
  if (!timingContext) return
  const timing = context.timingFor(timingContext)
  element.setAttribute('data-ts-motion-role', timingContext.role)

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

  const targetOpacity = element.getAttribute('opacity')
  const opacity = Number(targetOpacity ?? 1)
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
  const timingContext = elementTimingContext(
    element,
    'exit',
    context.previousScene ?? context.scene,
  )
  if (!timingContext) {
    element.remove()
    return
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
    finish() {
      element.remove()
      if (retargetLayer && !retargetLayer.children.length) {
        retargetLayer.setAttribute('visibility', 'hidden')
      }
    },
    cancel() {
      element.removeAttribute('data-ts-motion-role')
    },
  })
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
  const point = scene.points.find((candidate) => candidate.key === key)
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
      if (seriesElementForPoint(point, pathGroups)) {
        presented.set(identity, previous ?? point)
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
      presented.set(identity, previous)
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
    presented.set(identity, start)
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

  const pathSeries = new Map<string, ChartPoint[]>()
  for (const point of scene.points) {
    if (verticalBars.has(point.key) || horizontalBars.has(point.key)) continue
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
      finish() {
        presented.delete(identity)
        runtime.points.delete(identity)
      },
    })
  }

  const publish = () => setPresentationPoints?.([...presented.values()])
  publish()
  return { tracks, publish }
}

function keyedElements(root: SVGSVGElement, selector: string) {
  return new Set(keyedElementMap(root, selector).keys())
}

function keyedElementMap(root: SVGSVGElement, selector: string) {
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
  const apply = (definition: ChartMotionDefinition<any> | undefined) => {
    const authored =
      typeof definition === 'function' ? definition(context) : definition
    if (!authored) return
    if (authored.delay !== undefined) delay = nonNegative(authored.delay, delay)
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
  return { delay, transition }
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
  if (!source) return undefined
  const [definition, initialized] = source
  const marks: Record<string, ChartMotionDefinition<any>> = {}
  initialized.forEach((mark, index) => {
    const authored = mark.motion ?? definition.marks[index]?.motion
    if (authored !== undefined) marks[mark.id] = authored
  })

  const guides: Record<string, ChartMotionDefinition<any>> = {}
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

  const hasMarks = Object.keys(marks).length > 0
  const hasGuides = Object.keys(guides).length > 0
  if (definition.motion === undefined && !hasMarks && !hasGuides) {
    return undefined
  }
  return {
    ...(definition.motion === undefined ? {} : { default: definition.motion }),
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
  root: SVGSVGElement,
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
