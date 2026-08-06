import { matchesFocusPoint } from './focus-layer'
import {
  createScenePointLookup,
  sceneNodeOwnedPoints,
  type ScenePointLookup,
} from './scene-point-ownership-internal'
import type {
  ChartAnimationOptions,
  ChartFocusMatch,
  ChartFocusState,
  ChartMarkStateTransition,
  ChartMarkState,
  ChartMarkStateContext,
  ChartMarkStateSelector,
  ChartMarkStateStyle,
  ChartPoint,
  ChartScene,
  ChartTooltipPosition,
  SceneNode,
  SceneStyle,
} from './types'

export interface ResolvedMarkState<TScene extends ChartScene = ChartScene> {
  scene: TScene
  transition?: ChartMarkStateTransition
  transitions?: Readonly<Record<string, ChartMarkStateTransition>>
}

export function resolveMarkStateScene<TScene extends ChartScene>(
  scene: TScene,
  focus: ChartFocusState | null,
  pointer: ChartTooltipPosition | null = null,
): ResolvedMarkState<TScene> {
  if (!focus || !sceneHasMarkStates(scene.nodes)) return { scene }
  let transition: ChartMarkStateTransition | undefined
  const transitions: Record<string, ChartMarkStateTransition> = {}

  const visit = (
    nodes: readonly SceneNode[],
    inheritedPoints?: readonly ChartPoint[],
    definitions?: readonly ChartMarkState<any>[],
    data?: readonly unknown[],
    inheritedLookup?: ScenePointLookup,
  ): readonly SceneNode[] =>
    nodes.map((node) => {
      const state = node.kind === 'group' ? node.states : undefined
      const points = state?.points ?? inheritedPoints
      const nodeDefinitions = state?.definitions ?? definitions
      const nodeData = state?.data ?? data
      const lookup = state
        ? createScenePointLookup(state.points)
        : inheritedLookup
      const candidates = points
        ? lookup
          ? sceneNodeOwnedPoints(node, points, lookup)
          : points
        : emptyPoints
      const resolved =
        node.kind !== 'group' &&
        nodeDefinitions &&
        nodeData &&
        candidates.length
          ? resolveNodeState(
              node,
              candidates,
              nodeData,
              nodeDefinitions,
              focus,
              pointer,
            )
          : { node }
      if (resolved.transition) {
        transition = mergeTransition(transition, resolved.transition)
        for (const point of candidates) {
          transitions[point.markId] = mergeTransition(
            transitions[point.markId],
            resolved.transition,
          )
        }
      }
      const next = resolved.node
      return next.kind === 'group'
        ? {
            ...next,
            children: visit(
              next.children,
              candidates.length ? candidates : points,
              nodeDefinitions,
              nodeData,
              lookup,
            ),
          }
        : next
    })

  const nodes = visit(scene.nodes)
  return {
    scene: { ...scene, nodes } as TScene,
    transition,
    ...(Object.keys(transitions).length ? { transitions } : {}),
  }
}

export function resolveMarkStateTransition(
  transition: ChartMarkStateTransition | undefined,
  element: Element,
): ChartAnimationOptions | undefined {
  if (!transition || transition.type !== 'tween') return undefined
  if (
    (transition.respectReducedMotion ?? true) &&
    element.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
  ) {
    return undefined
  }
  const { type: _type, ...resolved } = transition
  return resolved
}

export function sceneHasMarkStates(nodes: readonly SceneNode[]): boolean {
  return nodes.some(
    (node) =>
      node.kind === 'group' &&
      (node.states !== undefined || sceneHasMarkStates(node.children)),
  )
}

function resolveNodeState(
  node: SceneNode,
  candidates: readonly ChartPoint[],
  data: readonly unknown[],
  definitions: readonly ChartMarkState<any>[],
  focus: ChartFocusState,
  pointer: ChartTooltipPosition | null,
): { node: SceneNode; transition?: ChartMarkStateTransition } {
  let output = node
  let transition: ChartMarkStateTransition | undefined

  for (const definition of definitions) {
    const context = matchingContext(
      candidates,
      data,
      definition,
      focus,
      pointer,
    )
    if (!context) continue
    output = applyStateStyle(output, definition.style, context)
    if (definition.transition) {
      transition = mergeTransition(transition, definition.transition)
    }
  }
  return { node: output, transition }
}

function matchingContext(
  candidates: readonly ChartPoint[],
  data: readonly unknown[],
  definition: ChartMarkState<any>,
  focus: ChartFocusState,
  pointer: ChartTooltipPosition | null,
): ChartMarkStateContext | undefined {
  if (
    typeof definition.when !== 'function' &&
    definition.when.focus === 'unmatched' &&
    candidates.some((point) => matchesFocusPoint(point, focus, 'group'))
  ) {
    return undefined
  }
  for (const point of candidates) {
    const context: ChartMarkStateContext = {
      datum: point.datum,
      index: point.datumIndex,
      data,
      point,
      focus,
      pointer,
      matches: (match) => matchesFocusPoint(point, focus, match),
    }
    const matches =
      typeof definition.when === 'function'
        ? definition.when(context)
        : matchesSelector(definition.when, context)
    if (matches) return context
  }
  return undefined
}

function matchesSelector(
  selector: ChartMarkStateSelector,
  context: ChartMarkStateContext,
) {
  const source = selector.source
  if (
    source !== undefined &&
    !(Array.isArray(source)
      ? source.includes(context.focus.source)
      : source === context.focus.source)
  ) {
    return false
  }
  if (
    selector.pinned !== undefined &&
    selector.pinned !== context.focus.pinned
  ) {
    return false
  }
  return selector.focus === 'unmatched'
    ? !context.matches('group')
    : context.matches(selector.focus)
}

function applyStateStyle(
  node: SceneNode,
  definition: ChartMarkStateStyle<any>,
  context: ChartMarkStateContext,
): SceneNode {
  const style: SceneStyle = { ...node.style }
  for (const property of styleProperties) {
    const value = resolveValue(definition[property], context)
    if (value !== undefined)
      (style as Record<string, unknown>)[property] = value
  }
  let output: SceneNode = { ...node, style }
  const dx = resolveValue(definition.dx, context) ?? 0
  const dy = resolveValue(definition.dy, context) ?? 0
  const r = resolveValue(definition.r, context)
  const radius = resolveValue(definition.radius, context)
  const inset = resolveValue(definition.inset, context)
  const fontSize = resolveValue(definition.fontSize, context)
  const fontWeight = resolveValue(definition.fontWeight, context)
  const rotate = resolveValue(definition.rotate, context)

  switch (output.kind) {
    case 'dot':
      output = {
        ...output,
        x: output.x + dx,
        y: output.y + dy,
        radius: r ?? output.radius,
      }
      break
    case 'rect': {
      const currentInset = output.inset ?? 0
      let nextInset = Math.max(0, inset ?? currentInset)
      if (
        Number.isFinite(output.maxThickness) &&
        (output.insetAxis === 'x' || output.insetAxis === 'y')
      ) {
        const currentThickness =
          output.insetAxis === 'x' ? output.width : output.height
        const bandThickness = currentThickness + currentInset * 2
        const requestedThickness = Math.max(0, bandThickness - nextInset * 2)
        const cappedThickness = Math.min(
          requestedThickness,
          Math.max(0, output.maxThickness!),
        )
        nextInset = (bandThickness - cappedThickness) / 2
      }
      const amount = nextInset - currentInset
      const insetX = output.insetAxis !== 'y' ? amount : 0
      const insetY = output.insetAxis !== 'x' ? amount : 0
      output = {
        ...output,
        x: output.x + insetX + dx,
        y: output.y + insetY + dy,
        width: Math.max(0, output.width - insetX * 2),
        height: Math.max(0, output.height - insetY * 2),
        radius: radius ?? output.radius,
        inset: nextInset,
      }
      break
    }
    case 'label':
      output = {
        ...output,
        x: output.x + dx,
        y: output.y + dy,
        fontSize: fontSize ?? output.fontSize,
        fontWeight: fontWeight ?? output.fontWeight,
        rotate: rotate ?? output.rotate,
      }
      break
  }
  return output
}

const styleProperties = [
  'fill',
  'fillOpacity',
  'stroke',
  'strokeOpacity',
  'strokeWidth',
  'opacity',
  'strokeDasharray',
] as const

function resolveValue<TValue>(
  value: TValue | ((context: ChartMarkStateContext) => TValue) | undefined,
  context: ChartMarkStateContext,
): TValue | undefined {
  return typeof value === 'function'
    ? (value as (context: ChartMarkStateContext) => TValue)(context)
    : value
}

const emptyPoints: readonly ChartPoint[] = []

function mergeTransition(
  current: ChartMarkStateTransition | undefined,
  next: ChartMarkStateTransition,
): ChartMarkStateTransition {
  if (!current || current.type !== next.type) return next
  if (current.type === 'spring' && next.type === 'spring') {
    return { ...current, ...next }
  }
  if (current.type !== 'tween' || next.type !== 'tween') return next
  return {
    ...current,
    ...next,
    duration: Math.max(current.duration ?? 250, next.duration ?? 250),
  }
}
