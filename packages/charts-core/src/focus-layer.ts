import { valueKey } from './scales'
import {
  createScenePointLookup,
  sceneKeyOwnedPoints,
  type ScenePointLookup,
} from './scene-point-ownership-internal'
import type {
  ChartFocusState,
  ChartPoint,
  ChartScene,
  SceneGroup,
  SceneNode,
} from './types'

export interface ResolvedFocusScene<TScene extends ChartScene = ChartScene> {
  scene: TScene
  retargeted: boolean
}

const emptyPoints: readonly ChartPoint[] = []

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
          matchesFocusPoint(point, focus, node.focus!.match),
        )
        const selected = stabilizeSelectedNodes(
          filterNodes(
            node.focus.candidates ?? node.children,
            points,
            node.focus.points,
          ),
          points,
          node.focus.points,
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
  if (layer.focus.retarget) {
    const keys = new Set<string>()
    visitNodes(layer.children, (node) => keys.add(node.key))
    return keys
  }
  const points = layer.focus.points.filter((point) =>
    matchesFocusPoint(point, focus, layer.focus!.match),
  )
  const filtered = filterNodes(layer.children, points, layer.focus.points)
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
      if (node.focus.retarget) {
        if (node.children.length) {
          output.push({ ...node, focus: undefined })
        }
        continue
      }
      const points = node.focus.points.filter((point) =>
        matchesFocusPoint(point, focus, node.focus!.match),
      )
      const children = filterNodes(node.children, points, node.focus.points)
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
        directlyOwnedPoints(node, candidatePoints, lookup).some((point) =>
          selectedPoints.includes(point),
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
    const atomicPoints = atomicGroupPoints(node, candidatePoints)
    if (atomicPoints.length) {
      if (atomicPoints.some((point) => selectedPoints.includes(point))) {
        output.push(node)
      }
      continue
    }
    const structuralPoints = sceneKeyOwnedPoints(
      node.key,
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
  layerKey: string,
): SceneNode[] {
  const slots = new Map(points.map((point, index) => [point, index]))
  const lookup = createScenePointLookup(candidatePoints)
  const visit = (node: SceneNode, path: string): SceneNode => {
    const related = directlyOwnedPoints(node, candidatePoints, lookup).filter(
      (point) => slots.has(point),
    )
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

function directlyOwnedPoints(
  node: SceneNode,
  candidatePoints: readonly ChartPoint[],
  lookup: ScenePointLookup,
): readonly ChartPoint[] {
  if (node.kind === 'group') {
    const point = focusCandidatePoint(node, candidatePoints)
    if (point) return [point]
  }
  if (node.pointOwner) {
    const owned = ownedPointCandidates(node.pointOwner, candidatePoints)
    if (owned.length) return owned
  }
  if ('interaction' in node && node.interaction) {
    const interactionPoints = node.interaction.point
      ? [node.interaction.point]
      : node.interaction.points
    const owned = interactionPoints.flatMap((point) => {
      const identical = candidatePoints.filter(
        (candidate) => candidate === point,
      )
      if (identical.length) return identical
      const keyed = exactKeyPoints(point.key, candidatePoints)
      if (keyed.length) return keyed
      return candidatePoints.filter((candidate) =>
        sameFocusedPoint(candidate, point),
      )
    })
    if (owned.length) return owned
  }
  return sceneKeyOwnedPoints(node.key, candidatePoints, lookup, emptyPoints)
}

function atomicGroupPoints(
  node: SceneGroup,
  candidatePoints: readonly ChartPoint[],
): readonly ChartPoint[] {
  const candidate = focusCandidatePoint(node, candidatePoints)
  if (candidate) return [candidate]
  if (node.pointOwner) {
    const owned = ownedPointCandidates(node.pointOwner, candidatePoints)
    if (owned.length) return owned
  }
  return exactKeyPoints(node.key, candidatePoints)
}

function ownedPointCandidates(
  owner: ChartPoint,
  candidatePoints: readonly ChartPoint[],
): readonly ChartPoint[] {
  const identical = candidatePoints.filter((candidate) => candidate === owner)
  if (identical.length) return identical
  const keyed = exactKeyPoints(owner.key, candidatePoints)
  if (keyed.length) return keyed
  return candidatePoints.filter((candidate) =>
    sameFocusedPoint(candidate, owner),
  )
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

function exactKeyPoints(
  key: string,
  candidatePoints: readonly ChartPoint[],
): readonly ChartPoint[] {
  return candidatePoints.filter((point) => point.key === key)
}

export function matchesFocusPoint(
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
    return focus.group.some((point) => sameFocusedPoint(candidate, point))
  }
  return sameFocusedPoint(candidate, focus.primary)
}

function sameFocusedPoint(left: ChartPoint, right: ChartPoint) {
  if (left === right || left.key === right.key) return true
  if (!Object.is(left.datum, right.datum)) return false
  return isReference(left.datum) || left.datumIndex === right.datumIndex
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
