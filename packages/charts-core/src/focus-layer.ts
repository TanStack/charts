import { valueKey } from './scales'
import type {
  ChartFocusState,
  ChartPoint,
  ChartScene,
  SceneGroup,
  SceneNode,
} from './types'

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
  const points = layer.focus.points.filter((point) =>
    matchesFocusPoint(point, focus, layer.focus!.match),
  )
  const filtered = filterNodes(layer.children, points)
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
      const points = node.focus.points.filter((point) =>
        matchesFocusPoint(point, focus, node.focus!.match),
      )
      const children = filterNodes(node.children, points)
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
  points: readonly ChartPoint[],
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') {
      if (points.some((point) => keysRelate(node.key, point.key))) {
        output.push(node)
      }
      continue
    }
    const children = filterNodes(node.children, points)
    if (children.length) {
      output.push({ ...node, children })
    } else if (points.some((point) => point.key.startsWith(`${node.key}:`))) {
      output.push(node)
    }
  }
  return output
}

function matchesFocusPoint(
  candidate: ChartPoint,
  focus: ChartFocusState,
  match: NonNullable<SceneGroup['focus']>['match'],
) {
  if (match === 'x') {
    return sameValue(candidate.xValue, focus.primary.xValue)
  }
  if (match === 'y') {
    return sameValue(candidate.yValue, focus.primary.yValue)
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
    return focus.group.some((point) => sameSemanticPoint(candidate, point))
  }
  return sameSemanticPoint(candidate, focus.primary)
}

function sameSemanticPoint(left: ChartPoint, right: ChartPoint) {
  return (
    left.datum === right.datum ||
    (sameValue(left.xValue, right.xValue) &&
      sameValue(left.yValue, right.yValue) &&
      sameValue(left.group, right.group))
  )
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

function visitNodes(
  nodes: readonly SceneNode[],
  visit: (node: SceneNode) => void,
) {
  for (const node of nodes) {
    visit(node)
    if (node.kind === 'group') visitNodes(node.children, visit)
  }
}
