import {
  createScenePointLookup,
  sceneNodeOwnedPoints,
  type ScenePointLookup,
} from './scene-point-ownership-internal'
import type {
  ChartPoint,
  ChartValue,
  MarkScene,
  SceneGroup,
  SceneNode,
} from './types'

export interface FilterMarkSceneOptions {
  interaction?: 'preserve' | 'remove'
}

export interface StripMarkSceneInteractionOptions {
  conditional?: 'remove' | 'reject'
}

/** Removes every interaction-owned scene field without changing painted geometry. */
export function stripMarkSceneInteraction<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: MarkScene<TDatum, TXValue, TYValue>,
  options: StripMarkSceneInteractionOptions = {},
): MarkScene<TDatum, TXValue, TYValue> {
  return {
    nodes: scene.nodes.map((node) =>
      stripSceneNodeInteraction(node, options.conditional ?? 'remove'),
    ),
    points: [],
  }
}

/** Filters painted mark output by semantic point after channels and scales resolve. */
export function filterMarkSceneByPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: MarkScene<TDatum, TXValue, TYValue>,
  include: (point: ChartPoint<TDatum, TXValue, TYValue>) => boolean,
  options: FilterMarkSceneOptions = {},
): MarkScene<TDatum, TXValue, TYValue> {
  const interaction = options.interaction ?? 'preserve'
  const points = collectMarkScenePoints(scene)
  const lookup = createScenePointLookup(points)
  const nodes = scene.nodes.flatMap((node) => {
    const filtered = filterNode(
      node,
      points,
      lookup,
      include,
      interaction,
      points,
    )
    return filtered ? [filtered] : []
  })

  if (interaction === 'remove') return { nodes, points: [] }
  return scene.points
    ? { nodes, points: scene.points.filter(include) }
    : { nodes }
}

function filterNode<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  node: SceneNode,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  lookup: ScenePointLookup,
  include: (point: ChartPoint<TDatum, TXValue, TYValue>) => boolean,
  interaction: 'preserve' | 'remove',
  scope: readonly ChartPoint<TDatum, TXValue, TYValue>[],
): SceneNode | null {
  if (node.kind === 'group') {
    const owned = sceneNodeOwnedPoints(
      node,
      scope,
      lookup,
    ) as readonly ChartPoint<TDatum, TXValue, TYValue>[]
    const childScope =
      metadataPoints<TDatum, TXValue, TYValue>(node) ??
      (owned.length ? owned : scope)
    const children = node.children.flatMap((child) => {
      const filtered = filterNode(
        child,
        points,
        lookup,
        include,
        interaction,
        childScope,
      )
      return filtered ? [filtered] : []
    })
    const candidates = node.focus?.candidates?.flatMap((candidate) => {
      const filtered = filterNode(
        candidate,
        points,
        lookup,
        include,
        interaction,
        node.focus!.points as readonly ChartPoint<TDatum, TXValue, TYValue>[],
      )
      return filtered ? [filtered] : []
    })
    if (!children.length && !candidates?.length) return null
    const filtered = filterGroupState(node, children, candidates, include)
    return interaction === 'remove'
      ? stripSceneNodeInteraction(filtered, 'remove')
      : filtered
  }

  const owned = sceneNodeOwnedPoints(
    node,
    scope,
    lookup,
  ) as readonly ChartPoint<TDatum, TXValue, TYValue>[]
  if (!owned.some(include)) return null

  if (interaction === 'remove') {
    return stripSceneNodeInteraction(node, 'remove')
  }

  if (node.kind !== 'label' && node.interaction && !node.interaction.point) {
    const included = (
      node.interaction.points as readonly ChartPoint<TDatum, TXValue, TYValue>[]
    ).filter(include)
    return {
      ...node,
      interaction: { ...node.interaction, points: included },
    }
  }

  return node
}

function stripSceneNodeInteraction(
  node: SceneNode,
  conditional: 'remove' | 'reject',
): SceneNode {
  if (node.kind === 'group') {
    if (conditional === 'reject' && (node.focus || node.states)) {
      throw new TypeError(
        'decorative() cannot wrap scene geometry with focus or state behavior',
      )
    }
    const children =
      node.focus?.retarget && node.focus.candidates
        ? node.focus.candidates
        : node.children
    const {
      focus: _focus,
      states: _states,
      pointOwner: _pointOwner,
      focusCandidateIndex: _focusCandidateIndex,
      ...decorative
    } = node
    return {
      ...decorative,
      children: children.map((child) =>
        stripSceneNodeInteraction(child, conditional),
      ),
    }
  }

  if (node.kind === 'label') {
    const { pointOwner: _pointOwner, ...decorative } = node
    return decorative
  }
  const {
    interaction: _interaction,
    pointOwner: _pointOwner,
    ...decorative
  } = node
  return decorative
}

function metadataPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  node: SceneGroup,
): readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined {
  return (node.focus?.activePoints ??
    node.focus?.points ??
    node.states?.points) as
    readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined
}

function filterGroupState<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  node: SceneGroup,
  children: readonly SceneNode[],
  candidates: readonly SceneNode[] | undefined,
  include: (point: ChartPoint<TDatum, TXValue, TYValue>) => boolean,
): SceneGroup {
  return {
    ...node,
    children,
    ...(node.focus
      ? {
          focus: {
            ...node.focus,
            points: (
              node.focus.points as readonly ChartPoint<
                TDatum,
                TXValue,
                TYValue
              >[]
            ).filter(include),
            ...(candidates ? { candidates } : {}),
            ...(node.focus.activePoints
              ? {
                  activePoints: (
                    node.focus.activePoints as readonly ChartPoint<
                      TDatum,
                      TXValue,
                      TYValue
                    >[]
                  ).filter(include),
                }
              : {}),
          },
        }
      : {}),
    ...(node.states
      ? {
          states: {
            ...node.states,
            points: (
              node.states.points as readonly ChartPoint<
                TDatum,
                TXValue,
                TYValue
              >[]
            ).filter(include),
          },
        }
      : {}),
  }
}

function collectMarkScenePoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: MarkScene<TDatum, TXValue, TYValue>,
): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
  const points = scene.points ? [...scene.points] : []
  const seen = new Set(points)
  const add = (candidates: readonly ChartPoint[]) => {
    for (const point of candidates) {
      const typed = point as ChartPoint<TDatum, TXValue, TYValue>
      if (seen.has(typed)) continue
      seen.add(typed)
      points.push(typed)
    }
  }
  const visit = (nodes: readonly SceneNode[]) => {
    for (const node of nodes) {
      if (node.pointOwner) add([node.pointOwner])
      if (node.kind === 'group') {
        if (node.focus) {
          add(node.focus.points)
          if (node.focus.activePoints) add(node.focus.activePoints)
          if (node.focus.candidates) visit(node.focus.candidates)
        }
        if (node.states) add(node.states.points)
        visit(node.children)
        continue
      }
      if (node.kind === 'label' || !node.interaction) continue
      const candidates = node.interaction.point
        ? [node.interaction.point]
        : node.interaction.points
      add(candidates)
    }
  }
  visit(scene.nodes)
  return points
}
