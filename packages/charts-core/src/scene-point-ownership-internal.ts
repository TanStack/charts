import type { ChartPoint, SceneNode } from './types'

export interface ScenePointLookup {
  points: readonly ChartPoint[]
  keys: ReadonlyMap<string, readonly ChartPoint[]>
  marks: ReadonlyMap<string, readonly ChartPoint[]>
}

/** Indexes structural point identity without treating opaque keys as prefixes. */
export function createScenePointLookup(
  points: readonly ChartPoint[],
): ScenePointLookup {
  const keys = new Map<string, ChartPoint[]>()
  const marks = new Map<string, ChartPoint[]>()
  const append = (
    map: Map<string, ChartPoint[]>,
    key: string,
    point: ChartPoint,
  ) => {
    const related = map.get(key)
    if (related) related.push(point)
    else map.set(key, [point])
  }

  for (const point of points) {
    append(marks, point.markId, point)
    let end = point.key.length
    while (end > 0) {
      append(keys, point.key.slice(0, end), point)
      end = point.key.lastIndexOf(':', end - 1)
    }
  }

  return { points, keys, marks }
}

/** Returns the semantic points explicitly or structurally owned by one node. */
export function sceneNodeOwnedPoints(
  node: SceneNode,
  scope: readonly ChartPoint[],
  lookup: ScenePointLookup,
  fallback: readonly ChartPoint[] = scope,
): readonly ChartPoint[] {
  if (node.kind === 'group') {
    const index = node.focusCandidateIndex
    if (index !== undefined && Number.isInteger(index) && index >= 0) {
      const point = scope[index]
      if (point) return [point]
    }
  }

  if (node.pointOwner) {
    const owned = pointCandidates(node.pointOwner, scope)
    if (owned.length) return owned
  }

  if ('interaction' in node && node.interaction) {
    const candidates = node.interaction.point
      ? [node.interaction.point]
      : node.interaction.points
    const owned = candidates.flatMap((candidate) =>
      pointCandidates(candidate, scope),
    )
    if (owned.length) return owned
  }

  return sceneKeyOwnedPoints(node.key, scope, lookup, fallback)
}

export function sceneKeyOwnedPoints(
  key: string,
  scope: readonly ChartPoint[],
  lookup: ScenePointLookup,
  fallback: readonly ChartPoint[] = scope,
): readonly ChartPoint[] {
  const withinScope = (candidates: readonly ChartPoint[] | undefined) =>
    candidates === undefined
      ? []
      : scope === lookup.points
        ? candidates
        : candidates.filter((point) => scope.includes(point))

  const related = withinScope(lookup.keys.get(key))
  const exact = related.filter((point) => point.key === key)
  if (exact.length) return exact

  // Generated geometry may suffix its point key. Resolve longest-first so
  // opaque keys such as `a` and `a:child` never alias when no owner is given.
  let candidate = key
  while (candidate.includes(':')) {
    const separator = candidate.lastIndexOf(':')
    candidate = candidate.slice(0, separator)
    const fragments = withinScope(lookup.keys.get(candidate)).filter(
      (point) => point.key === candidate,
    )
    if (fragments.length) return fragments
  }

  if (related.length) return related
  const mark = withinScope(lookup.marks.get(key))
  if (mark.length) return mark

  // Arbitrary custom subtree keys inherit their nearest explicit scope.
  return fallback
}

function pointCandidates(
  owner: ChartPoint,
  scope: readonly ChartPoint[],
): readonly ChartPoint[] {
  const identical = scope.filter((point) => point === owner)
  if (identical.length) return identical
  const keyed = scope.filter((point) => point.key === owner.key)
  if (keyed.length) return keyed
  const semantic = scope.filter(
    (point) =>
      Object.is(point.datum, owner.datum) &&
      (isReference(owner.datum) || point.datumIndex === owner.datumIndex),
  )
  return semantic.length === 1 ? semantic : []
}

function isReference(value: unknown) {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  )
}
