import type {
  ChartBounds,
  ChartFocusAffinity,
  ChartPoint,
  ChartScene,
  ChartValue,
  SceneInteraction,
  SceneNode,
} from './types'

type GeometricSceneNode = Exclude<SceneNode, { kind: 'group' | 'label' }>
type InteractiveSceneNode = GeometricSceneNode & {
  interaction: SceneInteraction
}

interface SceneInteractionTarget {
  node: InteractiveSceneNode
  offsetX: number
  offsetY: number
  bounds: ChartBounds
  clip?: ChartBounds
}

interface SceneInteractionIndex {
  targets: readonly SceneInteractionTarget[]
  attachedPoints: ReadonlySet<ChartPoint>
}

const sceneInteractionCache = new WeakMap<object, SceneInteractionIndex>()

/** Legacy point-anchor lookup used by explicit point-only indexes. */
export function nearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  x: number,
  y: number,
  maxDistance: number,
): ChartPoint<TDatum, TXValue, TYValue> | null {
  let result: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let resultDistance = Infinity
  for (let index = points.length; index--;) {
    const point = points[index]!
    const dx = point.x - x
    const dy = point.y - y
    const distance = dx * dx + dy * dy
    // Reverse traversal with <= preserves the historical first-point tie.
    if (distance <= resultDistance) {
      result = point
      resultDistance = distance
    }
  }
  return result && resultDistance <= Math.max(0, maxDistance) ** 2
    ? result
    : null
}

export function nearestScenePoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  x: number,
  y: number,
  maxDistance: number,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[] = scene.points,
): ChartPoint<TDatum, TXValue, TYValue> | null {
  const index = interactionIndex(scene)
  const allowed =
    points === scene.points ? undefined : new Set<ChartPoint>(points)
  if (!index.targets.length && !index.attachedPoints.size) {
    return nearestPoint(points, x, y, maxDistance)
  }

  const contained = findContainingScenePoint(scene, x, y, points)
  if (contained) return contained.point

  let resultPoint: ChartPoint | undefined
  let resultInteraction: SceneInteraction | undefined
  let resultPrimaryDistance = Infinity
  let resultGeometryDistance = Infinity

  for (const target of index.targets) {
    const interaction = target.node.interaction
    if (!hasAllowedInteractionPoint(interaction, allowed)) continue
    const affinity = interaction.affinity ?? 'xy'
    if (affinity === 'geometry') continue
    const axis = affinity === 'x' ? 'x' : affinity === 'y' ? 'y' : undefined
    const primaryDistance = axis
      ? squaredAxisDistance(target.bounds, axis === 'x' ? x : y, axis)
      : distanceToTarget(target, x, y)
    if (primaryDistance > resultPrimaryDistance) continue
    const geometryDistance = axis
      ? distanceToTarget(target, x, y)
      : primaryDistance
    if (
      primaryDistance < resultPrimaryDistance ||
      (primaryDistance === resultPrimaryDistance &&
        geometryDistance < resultGeometryDistance)
    ) {
      resultInteraction = interaction
      resultPoint = undefined
      resultPrimaryDistance = primaryDistance
      resultGeometryDistance = geometryDistance
    }
  }

  // Plain semantic points remain a backwards-compatible anchor-only target.
  if (resultPrimaryDistance !== 0) {
    for (const point of points) {
      if (index.attachedPoints.has(point)) continue
      const dx = point.x - x
      const dy = point.y - y
      const distance = dx * dx + dy * dy
      if (distance < resultPrimaryDistance) {
        resultPoint = point
        resultInteraction = undefined
        resultPrimaryDistance = distance
        resultGeometryDistance = distance
      }
    }
  }

  if (resultPrimaryDistance > Math.max(0, maxDistance) ** 2) return null
  const result =
    resultPoint ??
    (resultInteraction
      ? bestInteractionPoint(resultInteraction, x, y, allowed)
      : undefined)
  return (result as ChartPoint<TDatum, TXValue, TYValue> | undefined) ?? null
}

/** Returns the topmost painted interaction target containing a scene point. */
export function findContainingScenePoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  x: number,
  y: number,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[] = scene.points,
): Readonly<{
  point: ChartPoint<TDatum, TXValue, TYValue> | null
}> | null {
  const index = interactionIndex(scene)
  const allowed =
    points === scene.points ? undefined : new Set<ChartPoint>(points)
  // Painted containment is authoritative and follows actual reverse paint order.
  for (let targetIndex = index.targets.length; targetIndex--;) {
    const target = index.targets[targetIndex]!
    if (containsBounds(target.bounds, x, y) && containsTarget(target, x, y)) {
      const interaction = target.node.interaction
      const point = bestInteractionPoint(interaction, x, y, allowed)
      const hasSemanticPoint = interaction.point
        ? true
        : interaction.points.length > 0
      if (point || !allowed || !hasSemanticPoint) {
        return {
          point: point as ChartPoint<TDatum, TXValue, TYValue> | null,
        }
      }
    }
  }
  return null
}

function interactionIndex(scene: ChartScene): SceneInteractionIndex {
  const cached = sceneInteractionCache.get(scene)
  if (cached) return cached
  const targets: SceneInteractionTarget[] = []
  const attachedPoints = new Set<ChartPoint>()
  collectTargets(scene.nodes, 0, 0, undefined, targets, attachedPoints)
  const index = { targets, attachedPoints }
  sceneInteractionCache.set(scene, index)
  return index
}

function collectTargets(
  nodes: readonly SceneNode[],
  offsetX: number,
  offsetY: number,
  clip: ChartBounds | null | undefined,
  targets: SceneInteractionTarget[],
  attachedPoints: Set<ChartPoint>,
): void {
  for (const node of nodes) {
    if (node.kind === 'group') {
      if (node.focus) continue
      const nextOffsetX = offsetX + (node.translateX ?? 0)
      const nextOffsetY = offsetY + (node.translateY ?? 0)
      const groupClip = node.clip
        ? translateBounds(node.clip, nextOffsetX, nextOffsetY)
        : undefined
      const nextClip = clip === null ? null : intersectBounds(clip, groupClip)
      collectTargets(
        node.children,
        nextOffsetX,
        nextOffsetY,
        nextClip,
        targets,
        attachedPoints,
      )
      continue
    }
    if (node.kind === 'label' || !node.interaction) continue
    if (node.interaction.point) attachedPoints.add(node.interaction.point)
    else {
      for (const point of node.interaction.points) attachedPoints.add(point)
    }
    if (clip === null) continue
    const localBounds = boundsForNode(node)
    if (!localBounds) continue
    const paintedBounds = translateBounds(localBounds, offsetX, offsetY)
    const visibleBounds = clip
      ? intersectBounds(paintedBounds, clip)
      : paintedBounds
    if (visibleBounds == null) continue
    targets.push({
      node: node as InteractiveSceneNode,
      offsetX,
      offsetY,
      bounds: visibleBounds,
      clip,
    })
  }
}

function bestInteractionPoint(
  interaction: SceneInteraction,
  x: number,
  y: number,
  allowed?: ReadonlySet<ChartPoint>,
): ChartPoint | null {
  if (interaction.point) {
    return !allowed || allowed.has(interaction.point) ? interaction.point : null
  }
  const affinity = interaction.affinity ?? 'xy'
  let result: ChartPoint | undefined
  let primaryDistance = Infinity
  let secondaryDistance = Infinity
  for (const point of interaction.points) {
    if (allowed && !allowed.has(point)) continue
    const dx = point.x - x
    const dy = point.y - y
    const fullDistance = dx * dx + dy * dy
    const nextPrimary =
      affinity === 'x' ? dx * dx : affinity === 'y' ? dy * dy : fullDistance
    if (
      nextPrimary < primaryDistance ||
      (nextPrimary === primaryDistance && fullDistance < secondaryDistance)
    ) {
      result = point
      primaryDistance = nextPrimary
      secondaryDistance = fullDistance
    }
  }
  return result ?? null
}

function hasAllowedInteractionPoint(
  interaction: SceneInteraction,
  allowed: ReadonlySet<ChartPoint> | undefined,
) {
  if (!allowed) return true
  return interaction.point
    ? allowed.has(interaction.point)
    : interaction.points.some((point) => allowed.has(point))
}

function containsTarget(target: SceneInteractionTarget, x: number, y: number) {
  const localX = x - target.offsetX
  const localY = y - target.offsetY
  const { node } = target
  switch (node.kind) {
    case 'rect':
      return containsRoundedRect(node, localX, localY)
    case 'dot': {
      const dx = localX - node.x
      const dy = localY - node.y
      const radius = Math.max(0, node.radius)
      return dx * dx + dy * dy <= radius * radius
    }
    case 'area':
      return containsPolygon(node.points, localX, localY)
    case 'polyline':
      return (
        squaredDistanceToPolyline(node.points, localX, localY, false) <=
        strokeRadius(node) ** 2
      )
    case 'rule':
      return (
        squaredDistanceToSegment(
          node.x1,
          node.y1,
          node.x2,
          node.y2,
          localX,
          localY,
        ) <=
        strokeRadius(node) ** 2
      )
  }
}

function distanceToTarget(
  target: SceneInteractionTarget,
  x: number,
  y: number,
) {
  const localX = x - target.offsetX
  const localY = y - target.offsetY
  const { node } = target
  let distance: number
  switch (node.kind) {
    case 'rect':
      distance = node.radius
        ? squaredDistanceToRoundedRect(node, localX, localY)
        : squaredDistanceToBounds(node, localX, localY)
      break
    case 'dot': {
      const dx = localX - node.x
      const dy = localY - node.y
      const amount = Math.max(
        0,
        Math.sqrt(dx * dx + dy * dy) - Math.max(0, node.radius),
      )
      distance = amount * amount
      break
    }
    case 'area':
      distance = squaredDistanceToPolyline(node.points, localX, localY, true)
      break
    case 'polyline': {
      const raw = squaredDistanceToPolyline(node.points, localX, localY, false)
      const amount = Math.max(0, Math.sqrt(raw) - strokeRadius(node))
      distance = amount * amount
      break
    }
    case 'rule': {
      const raw = squaredDistanceToSegment(
        node.x1,
        node.y1,
        node.x2,
        node.y2,
        localX,
        localY,
      )
      const amount = Math.max(0, Math.sqrt(raw) - strokeRadius(node))
      distance = amount * amount
      break
    }
  }
  return target.clip
    ? Math.max(distance, squaredDistanceToBounds(target.clip, x, y))
    : distance
}

function boundsForNode(node: GeometricSceneNode): ChartBounds | null {
  switch (node.kind) {
    case 'rect':
      return normalizeRect(node)
    case 'dot': {
      const radius = Math.max(0, node.radius)
      return {
        x: node.x - radius,
        y: node.y - radius,
        width: radius * 2,
        height: radius * 2,
      }
    }
    case 'area':
      return boundsFromPoints(node.points)
    case 'polyline': {
      const bounds = boundsFromPoints(node.points)
      return bounds ? expandBounds(bounds, strokeRadius(node)) : null
    }
    case 'rule':
      return expandBounds(
        {
          x: Math.min(node.x1, node.x2),
          y: Math.min(node.y1, node.y2),
          width: Math.abs(node.x2 - node.x1),
          height: Math.abs(node.y2 - node.y1),
        },
        strokeRadius(node),
      )
  }
}

function containsRoundedRect(
  node: Extract<SceneNode, { kind: 'rect' }>,
  x: number,
  y: number,
) {
  const bounds = normalizeRect(node)
  if (!containsBounds(bounds, x, y)) return false
  const radius = Math.max(
    0,
    Math.min(node.radius ?? 0, bounds.width / 2, bounds.height / 2),
  )
  if (
    radius === 0 ||
    (x >= bounds.x + radius && x <= bounds.x + bounds.width - radius) ||
    (y >= bounds.y + radius && y <= bounds.y + bounds.height - radius)
  ) {
    return true
  }
  const cornerX =
    x < bounds.x + radius ? bounds.x + radius : bounds.x + bounds.width - radius
  const cornerY =
    y < bounds.y + radius
      ? bounds.y + radius
      : bounds.y + bounds.height - radius
  const dx = x - cornerX
  const dy = y - cornerY
  return dx * dx + dy * dy <= radius * radius
}

function squaredDistanceToRoundedRect(
  node: Extract<SceneNode, { kind: 'rect' }>,
  x: number,
  y: number,
) {
  const bounds = normalizeRect(node)
  const halfWidth = bounds.width / 2
  const halfHeight = bounds.height / 2
  const radius = Math.max(0, Math.min(node.radius ?? 0, halfWidth, halfHeight))
  const offsetX = Math.abs(x - (bounds.x + halfWidth)) - (halfWidth - radius)
  const offsetY = Math.abs(y - (bounds.y + halfHeight)) - (halfHeight - radius)
  const outside =
    Math.sqrt(Math.max(0, offsetX) ** 2 + Math.max(0, offsetY) ** 2) - radius
  return Math.max(0, outside) ** 2
}

function containsPolygon(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
) {
  let inside = false
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index++
  ) {
    const current = points[index]!
    const prior = points[previous]!
    if (
      current[1] > y !== prior[1] > y &&
      x <
        ((prior[0] - current[0]) * (y - current[1])) / (prior[1] - current[1]) +
          current[0]
    ) {
      inside = !inside
    }
  }
  return inside
}

function squaredDistanceToPolyline(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
  closed: boolean,
) {
  if (!points.length) return Infinity
  if (points.length === 1) {
    const point = points[0]!
    return (point[0] - x) ** 2 + (point[1] - y) ** 2
  }
  let distance = Infinity
  const segmentCount = closed ? points.length : Math.max(0, points.length - 1)
  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index]!
    const end = points[(index + 1) % points.length]!
    distance = Math.min(
      distance,
      squaredDistanceToSegment(start[0], start[1], end[0], end[1], x, y),
    )
  }
  return distance
}

function squaredDistanceToSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = dx * dx + dy * dy
  const amount = length
    ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length))
    : 0
  const offsetX = x - (x1 + amount * dx)
  const offsetY = y - (y1 + amount * dy)
  return offsetX * offsetX + offsetY * offsetY
}

function boundsFromPoints(
  points: readonly (readonly [number, number])[],
): ChartBounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null
}

function normalizeRect(rect: ChartBounds): ChartBounds {
  return {
    x: Math.min(rect.x, rect.x + rect.width),
    y: Math.min(rect.y, rect.y + rect.height),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

function translateBounds(bounds: ChartBounds, x: number, y: number) {
  const normalized = normalizeRect(bounds)
  return { ...normalized, x: normalized.x + x, y: normalized.y + y }
}

function expandBounds(bounds: ChartBounds, amount: number): ChartBounds {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  }
}

function intersectBounds(
  left: ChartBounds | undefined,
  right: ChartBounds | undefined,
): ChartBounds | undefined | null {
  if (!left) return right
  if (!right) return left
  const x = Math.max(left.x, right.x)
  const y = Math.max(left.y, right.y)
  const rightEdge = Math.min(left.x + left.width, right.x + right.width)
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height)
  return rightEdge < x || bottomEdge < y
    ? null
    : { x, y, width: rightEdge - x, height: bottomEdge - y }
}

function containsBounds(bounds: ChartBounds, x: number, y: number) {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

function squaredAxisDistance(
  bounds: ChartBounds,
  value: number,
  axis: 'x' | 'y',
) {
  const start = axis === 'x' ? bounds.x : bounds.y
  const size = axis === 'x' ? bounds.width : bounds.height
  const distance =
    value < start
      ? start - value
      : value > start + size
        ? value - start - size
        : 0
  return distance * distance
}

function squaredDistanceToBounds(bounds: ChartBounds, x: number, y: number) {
  const normalized = normalizeRect(bounds)
  const dx =
    x < normalized.x
      ? normalized.x - x
      : x > normalized.x + normalized.width
        ? x - normalized.x - normalized.width
        : 0
  const dy =
    y < normalized.y
      ? normalized.y - y
      : y > normalized.y + normalized.height
        ? y - normalized.y - normalized.height
        : 0
  return dx * dx + dy * dy
}

function strokeRadius(node: GeometricSceneNode) {
  return Math.max(0, node.style?.strokeWidth ?? 1) / 2
}
