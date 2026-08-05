import { valueKey } from './scales'
import type {
  ChartCursorPresentation,
  ChartFocusAnchor,
  ChartFocusPresentation,
  ChartFocusState,
  ChartScene,
  ChartTooltipPosition,
  SceneFocusGuide,
  SceneGroup,
  SceneNode,
} from './types'

export function resolveFocusPresentation(
  scene: ChartScene,
  focus: ChartFocusState | null,
  pointer?: ChartTooltipPosition | null,
  cursor?: ChartCursorPresentation | null,
): ChartFocusPresentation {
  const focusedUnder = focusedSceneNodes(scene, focus, 'under')
  const focusedOver = focusedSceneNodes(scene, focus, 'over')
  const guides = resolveFocusGuides(scene, focus, pointer, cursor)
  // SVG keeps guide shells outside the static mark tree. Match that stable
  // renderer contract in every painter: under-guides precede authored
  // underlays, while over-guides follow authored overlays.
  return {
    under: [...guides.under, ...focusedUnder],
    over: [...focusedOver, ...guides.over],
  }
}

/** Resolves only renderer-native guide marks, excluding authored focus layers. */
export function resolveFocusGuides(
  scene: ChartScene,
  focus: ChartFocusState | null,
  pointer?: ChartTooltipPosition | null,
  cursor?: ChartCursorPresentation | null,
): ChartFocusPresentation {
  void pointer
  const under: SceneNode[] = []
  const over: SceneNode[] = []
  if (!cursor && !focus) return { under, over }

  for (const guide of scene.focusGuides ?? []) {
    const localFocus = focus && guideOwnsFocus(guide, focus) ? focus : null
    if (!cursor && focus && !localFocus) continue
    const node = guide.resolve({
      scene,
      guide,
      focus: localFocus,
      pointer,
      cursor,
    })
    if (!node) continue
    ;(guide.placement === 'under' ? under : over).push(node)
  }

  return { under, over }
}

export function focusedSceneNodes(
  scene: ChartScene,
  focus: ChartFocusState | null,
  placement: 'under' | 'over',
): SceneNode[] {
  if (!focus) return []
  return collectFocusedNodes(scene.nodes, focus, placement)
}

export function focusedNodeKeys(
  layer: SceneGroup,
  focus: ChartFocusState | null,
): Set<string> {
  if (!layer.focus || !focus) return new Set()
  const anchors = focusAnchors(layer.focus).filter((anchor) =>
    matchesFocusAnchor(anchor, focus, layer.focus!.match),
  )
  const filtered = filterNodes(layer.children, anchors)
  const keys = new Set<string>()
  visitNodes(filtered, (node) => keys.add(node.key))
  return keys
}

function collectFocusedNodes(
  nodes: readonly SceneNode[],
  focus: ChartFocusState,
  placement: 'under' | 'over',
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.focus) {
      if (node.focus.placement !== placement) continue
      const anchors = focusAnchors(node.focus).filter((anchor) =>
        matchesFocusAnchor(anchor, focus, node.focus!.match),
      )
      const children = filterNodes(node.children, anchors)
      if (children.length) output.push({ ...node, focus: undefined, children })
      continue
    }
    const children = collectFocusedNodes(node.children, focus, placement)
    if (children.length) output.push({ ...node, children })
  }
  return output
}

function filterNodes(
  nodes: readonly SceneNode[],
  anchors: readonly ChartFocusAnchor[],
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') {
      if (anchors.some((anchor) => keysRelate(node.key, anchor.key))) {
        output.push(node)
      }
      continue
    }
    const children = filterNodes(node.children, anchors)
    if (children.length) {
      output.push({ ...node, children })
    } else if (
      anchors.some((anchor) => anchor.key.startsWith(`${node.key}:`))
    ) {
      output.push(node)
    }
  }
  return output
}

function focusAnchors(focus: NonNullable<SceneGroup['focus']>) {
  return focus.anchors ?? focus.points
}

export function matchesFocusAnchor(
  candidate: ChartFocusAnchor,
  focus: ChartFocusState,
  match: NonNullable<SceneGroup['focus']>['match'],
) {
  if (match === 'x') {
    return (
      candidate.xValue !== undefined &&
      sameValue(candidate.xValue, focus.primary.xValue)
    )
  }
  if (match === 'y') {
    return (
      candidate.yValue !== undefined &&
      sameValue(candidate.yValue, focus.primary.yValue)
    )
  }
  if (match === 'series') {
    return sameValue(candidate.group, focus.primary.group)
  }
  if (match === 'key') {
    return (
      candidate.key === focus.primary.key ||
      candidate.datum === focus.primary.datum
    )
  }
  if (match === 'group') {
    return focus.group.some((point) => sameFocusedPoint(candidate, point))
  }
  return sameFocusedPoint(candidate, focus.primary)
}

function sameFocusedPoint(left: ChartFocusAnchor, right: ChartFocusAnchor) {
  if (left === right || left.key === right.key) return true
  return isReference(left.datum) && left.datum === right.datum
}

function sameValue(left: unknown, right: unknown) {
  return valueKey(left) === valueKey(right)
}

function keysRelate(left: string, right: string) {
  return (
    left === right ||
    left.startsWith(`${right}:`) ||
    right.startsWith(`${left}:`)
  )
}

function isReference(value: unknown) {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  )
}

function visitNodes(
  nodes: readonly SceneNode[],
  visit: (node: SceneNode) => void,
) {
  for (const node of nodes) {
    visit(node)
    if (node.kind === 'group') visitNodes(node.children, visit)
  }
}

function guideOwnsFocus(
  guide: SceneFocusGuide,
  focus: ChartFocusState,
): boolean {
  return (
    guide.scope === undefined ||
    focus.primary.key === guide.scope ||
    focus.primary.key.startsWith(`${guide.scope}:`)
  )
}
