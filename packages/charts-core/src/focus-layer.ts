import { valueKey } from './scales'
import {
  createScenePointLookup,
  sceneNodeOwnedPoints,
  type ScenePointLookup,
} from './scene-point-ownership-internal'
import type {
  ChartCursorPresentation,
  ChartFocusAnchor,
  ChartFocusPresentation,
  ChartFocusState,
  ChartPoint,
  ChartScene,
  ChartTooltipPosition,
  SceneFocusGuide,
  SceneGroup,
  SceneNode,
} from './types'

export interface ResolvedFocusScene<TScene extends ChartScene = ChartScene> {
  scene: TScene
  retargeted: boolean
}

const emptyPoints: readonly ChartPoint[] = []

export function resolveFocusPresentation(
  scene: ChartScene,
  focus: ChartFocusState | null,
  pointer?: ChartTooltipPosition | null,
  cursor?: ChartCursorPresentation | null,
): ChartFocusPresentation {
  const focusedScene = resolveFocusScene(scene, focus).scene
  const focusedUnder = focusedSceneNodes(focusedScene, focus, 'under')
  const focusedOver = focusedSceneNodes(focusedScene, focus, 'over')
  const guides = resolveFocusGuides(scene, focus, pointer, cursor)
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

/** Resolves retargeting focus candidates into stable selected scene children. */
export function resolveFocusScene<TScene extends ChartScene>(
  scene: TScene,
  focus: ChartFocusState | null,
): ResolvedFocusScene<TScene> {
  if (!focus) return { scene, retargeted: false }
  let retargeted = false

  const visit = (nodes: readonly SceneNode[]): readonly SceneNode[] =>
    nodes.map((node) => {
      if (node.kind !== 'group') return node
      if (node.focus?.retarget) {
        const points = node.focus.points.filter((point) =>
          matchesFocusAnchor(point, focus, node.focus!.match),
        )
        const lookup = createScenePointLookup(node.focus.points)
        const selected = stabilizeSelectedNodes(
          filterNodesWithLookup(
            node.focus.candidates ?? node.children,
            points,
            node.focus.points,
            lookup,
          ),
          points,
          node.focus.points,
          lookup,
          node.key,
        )
        if (!selected.length) return node
        retargeted = true
        return {
          ...node,
          focus: { ...node.focus, activePoints: points },
          children: selected,
        }
      }
      const children = visit(node.children)
      return children.some((child, index) => child !== node.children[index])
        ? { ...node, children }
        : node
    })

  const nodes = visit(scene.nodes)
  return retargeted
    ? { scene: { ...scene, nodes } as TScene, retargeted }
    : { scene, retargeted }
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
  const keys = new Set<string>()
  visitNodes(selectedFocusChildren(layer, focus), (node) => keys.add(node.key))
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
      const children = selectedFocusChildren(node, focus)
      if (children.length) output.push({ ...node, focus: undefined, children })
      continue
    }
    const children = collectFocusedNodes(node.children, focus, placement)
    if (children.length) output.push({ ...node, children })
  }
  return output
}

function selectedFocusChildren(
  layer: SceneGroup,
  focus: ChartFocusState,
): readonly SceneNode[] {
  const state = layer.focus!
  if (state.retarget) return layer.children
  if (state.anchors) {
    const anchors = state.anchors.filter((anchor) =>
      matchesFocusAnchor(anchor, focus, state.match),
    )
    return filterNodesByAnchors(layer.children, anchors)
  }
  const points = state.points.filter((point) =>
    matchesFocusAnchor(point, focus, state.match),
  )
  return filterNodes(layer.children, points, state.points)
}

function filterNodes(
  nodes: readonly SceneNode[],
  selectedPoints: readonly ChartPoint[],
  candidatePoints: readonly ChartPoint[],
): SceneNode[] {
  return filterNodesWithLookup(
    nodes,
    selectedPoints,
    candidatePoints,
    createScenePointLookup(candidatePoints),
  )
}

function filterNodesByAnchors(
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
    const children = filterNodesByAnchors(node.children, anchors)
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

function filterNodesWithLookup(
  nodes: readonly SceneNode[],
  selectedPoints: readonly ChartPoint[],
  candidatePoints: readonly ChartPoint[],
  lookup: ScenePointLookup,
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') {
      if (
        sceneNodeOwnedPoints(node, candidatePoints, lookup, emptyPoints).some(
          (point) => selectedPoints.includes(point),
        )
      ) {
        output.push(node)
      }
      continue
    }
    const structuralPoint = focusCandidatePoint(node, candidatePoints)
    if (structuralPoint) {
      if (selectedPoints.includes(structuralPoint)) output.push(node)
      continue
    }
    const atomicPoints = atomicGroupPoints(node, candidatePoints, lookup)
    if (atomicPoints.length) {
      if (atomicPoints.some((point) => selectedPoints.includes(point))) {
        output.push(node)
      }
      continue
    }
    const structuralPoints = sceneNodeOwnedPoints(
      node,
      candidatePoints,
      lookup,
      emptyPoints,
    )
    const childPoints = structuralPoints.length
      ? structuralPoints
      : candidatePoints
    const children = filterNodesWithLookup(
      node.children,
      selectedPoints,
      childPoints,
      lookup,
    )
    if (children.length) {
      output.push({ ...node, children })
    }
  }
  return output
}

function stabilizeSelectedNodes(
  nodes: readonly SceneNode[],
  points: readonly ChartPoint[],
  candidatePoints: readonly ChartPoint[],
  lookup: ScenePointLookup,
  layerKey: string,
): SceneNode[] {
  const slots = new Map(points.map((point, index) => [point, index]))
  const visit = (node: SceneNode, path: string): SceneNode => {
    const related = sceneNodeOwnedPoints(
      node,
      candidatePoints,
      lookup,
      emptyPoints,
    ).filter((point) => slots.has(point))
    const point = related.length === 1 ? related[0] : undefined
    let key = node.key
    if (point && node.key !== point.markId) {
      const slot = `${layerKey}:selection:${slots.get(point) ?? 0}`
      if (node.key === point.key) key = slot
      else if (node.key.startsWith(`${point.key}:`)) {
        key = `${slot}${node.key.slice(point.key.length)}`
      } else if (point.key.startsWith(`${node.key}:`)) {
        key = `${slot}:ancestor:${path}`
      } else {
        key = `${slot}:node:${path}`
      }
    }
    return node.kind === 'group'
      ? {
          ...node,
          key,
          children: node.children.map((child, index) =>
            visit(child, `${path}:${index}`),
          ),
        }
      : { ...node, key }
  }
  return nodes.map((node, index) => visit(node, String(index)))
}

function atomicGroupPoints(
  node: SceneGroup,
  candidatePoints: readonly ChartPoint[],
  lookup: ScenePointLookup,
): readonly ChartPoint[] {
  const candidate = focusCandidatePoint(node, candidatePoints)
  if (candidate) return [candidate]
  if (node.pointOwner) {
    const owned = sceneNodeOwnedPoints(
      node,
      candidatePoints,
      lookup,
      emptyPoints,
    )
    if (owned.length) return owned
  }
  const exact = lookup.keys
    .get(node.key)
    ?.filter((point) => point.key === node.key)
  return exact === undefined
    ? emptyPoints
    : exact.filter((point) => candidatePoints.includes(point))
}

function focusCandidatePoint(
  node: SceneGroup,
  candidatePoints: readonly ChartPoint[],
): ChartPoint | undefined {
  const index = node.focusCandidateIndex
  if (index === undefined || !Number.isInteger(index) || index < 0) {
    return undefined
  }
  return candidatePoints[index]
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

/** @deprecated Use `matchesFocusAnchor`; points are valid focus anchors. */
export const matchesFocusPoint = matchesFocusAnchor

function sameFocusedPoint(left: ChartFocusAnchor, right: ChartFocusAnchor) {
  if (left === right || left.key === right.key) return true
  if (!Object.is(left.datum, right.datum)) return false
  return isReference(left.datum) || left.datumIndex === right.datumIndex
}

function keysRelate(left: string, right: string) {
  return (
    left === right ||
    left.startsWith(`${right}:`) ||
    right.startsWith(`${left}:`)
  )
}

function sameValue(left: unknown, right: unknown) {
  return valueKey(left) === valueKey(right)
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
