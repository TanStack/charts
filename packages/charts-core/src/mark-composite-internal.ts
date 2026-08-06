import { resolveCompositeChildMotion } from './composite-motion-internal'
import { sceneChildId } from './scene-child-id-internal'
import {
  createScenePointLookup,
  sceneNodeOwnedPoints,
  type ScenePointLookup,
} from './scene-point-ownership-internal'
import type {
  ChartMark,
  ChartMarkDatum,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartPoint,
  ChartValue,
  InitializedMark,
  MarkRenderContext,
  MarkScene,
  MaterializedChannel,
  ResolvedScale,
  SceneLabel,
  SceneNode,
} from './types'

export type AnyInitializedMark = InitializedMark<any, any, any>
type AnyChartPoint = ChartPoint<any, any, any>

type ChildDatum<TMark> =
  TMark extends InitializedMark<infer TDatum, any, any> ? TDatum : never

type ChildXValue<TMark> =
  TMark extends InitializedMark<any, infer TXValue, any> ? TXValue : never

type ChildYValue<TMark> =
  TMark extends InitializedMark<any, any, infer TYValue> ? TYValue : never

export interface InitializedMarkComposition<
  TChildren extends readonly AnyInitializedMark[],
> {
  channels: Readonly<Record<string, MaterializedChannel>>
  seriesFromColor?: boolean
  childMotions: ReadonlyMap<string, ChartMotionDefinition<any>>
  layoutLabels?: (context: MarkRenderContext) => readonly SceneLabel[]
  render: (
    context: MarkRenderContext,
  ) => MarkScene<
    ChildDatum<TChildren[number]>,
    ChildXValue<TChildren[number]>,
    ChildYValue<TChildren[number]>
  >
}

interface ComposeInitializedMarksOptions {
  coordinates: 'semantic' | 'pixel'
  owner: 'Composite mark' | 'Resolved layout'
  interactiveChildren?: ReadonlySet<string>
}

/** Composes initialized child marks while preserving their normal scene API. */
export function composeInitializedMarks<
  const TChildren extends readonly AnyInitializedMark[],
>(
  parentId: string,
  children: TChildren,
  options: ComposeInitializedMarksOptions,
): InitializedMarkComposition<TChildren> {
  validateChildren(parentId, children, options.owner)
  const channels = mergeChildChannels(parentId, children, options)
  const scales =
    options.coordinates === 'pixel' ? resolvedPixelScales(children) : undefined
  const labels = children.flatMap((child, childIndex) =>
    child.layoutLabels ? [{ child, childIndex }] : [],
  )
  const childMotions = new Map(
    children.flatMap((child) =>
      child.motion === undefined
        ? []
        : [[compositeChildMarkId(parentId, child.id), child.motion] as const],
    ),
  )

  return {
    channels,
    ...(children.some((child) => child.seriesFromColor)
      ? { seriesFromColor: true }
      : {}),
    childMotions,
    ...(labels.length
      ? {
          layoutLabels: (context: MarkRenderContext) =>
            labels.flatMap(({ child, childIndex }) => {
              const namespace = childNamespace(parentId, child.id)
              return child.layoutLabels!(
                childContext(context, scales, childIndex),
              ).map((label) => namespaceLabel(label, namespace))
            }),
        }
      : {}),
    render: (context) => {
      const nodes: SceneNode[] = []
      const points: AnyChartPoint[] = []
      const firstBaseMarkIndex = children.findIndex((child) => !child.focus)

      children.forEach((child, childIndex) => {
        const rendered = child.render(childContext(context, scales, childIndex))
        const childPoints = collectRenderedPoints(rendered)
        const namespace = childNamespace(parentId, child.id)
        const namespaced = namespaceScene(
          rendered.nodes,
          childPoints,
          namespace,
        )
        const interactive =
          options.interactiveChildren === undefined ||
          options.interactiveChildren.has(child.id)
        const childNodes = interactive
          ? namespaced.nodes
          : stripSceneInteractions(namespaced.nodes, namespaced.points)

        if (!interactive) {
          nodes.push(...childNodes)
          return
        }

        if (child.focus) {
          const retarget = child.focus.retarget === true
          nodes.push({
            kind: 'group',
            key: `${namespace.prefix}:focus`,
            className: 'ts-chart__focus-layer',
            ariaHidden: true,
            focus: {
              match: child.focus.match ?? 'primary',
              points: namespaced.points,
              placement:
                firstBaseMarkIndex < 0 || childIndex < firstBaseMarkIndex
                  ? 'under'
                  : 'over',
              ...(retarget
                ? { retarget: true, candidates: namespaced.nodes }
                : {}),
            },
            children: retarget ? [] : childNodes,
          })
          return
        }

        if (child.states) {
          nodes.push({
            kind: 'group',
            key: `${namespace.prefix}:states`,
            children: childNodes,
            states: {
              data: child.states.data,
              definitions: child.states.definitions,
              points: namespaced.points,
            },
          })
        } else {
          nodes.push(...childNodes)
        }
        points.push(...namespaced.points)
      })

      return { nodes, points } as MarkScene<
        ChildDatum<TChildren[number]>,
        ChildXValue<TChildren[number]>,
        ChildYValue<TChildren[number]>
      >
    },
  }
}

type AnyChartMark = ChartMark<any, any, any, any, any>

interface InitializeCompositeMarkOptions<TDatum> {
  motion?: ChartMotionDefinition<TDatum>
  interactiveChildren?: ReadonlySet<string>
}

/** Initializes one ordinary semantic composite through the shared scene kernel. */
export function initializeCompositeMark<
  const TMarks extends readonly AnyChartMark[],
>(
  id: string,
  marks: TMarks,
  options: InitializeCompositeMarkOptions<ChartMarkDatum<TMarks[number]>> = {},
): InitializedMark<
  ChartMarkDatum<TMarks[number]>,
  ChartMarkPointX<TMarks[number]>,
  ChartMarkPointY<TMarks[number]>
> {
  const children = marks.map((mark, childIndex) =>
    mark.initialize({ markIndex: childIndex }),
  )
  const composition = composeInitializedMarks(id, children, {
    coordinates: 'semantic',
    owner: 'Composite mark',
    interactiveChildren: options.interactiveChildren,
  })
  const motion =
    options.motion !== undefined || composition.childMotions.size > 0
      ? (context: ChartMotionContext<ChartMarkDatum<TMarks[number]>>) =>
          resolveCompositeChildMotion(
            options.motion,
            composition.childMotions,
            context,
          )
      : undefined

  return {
    id,
    channels: composition.channels,
    ...(composition.seriesFromColor ? { seriesFromColor: true } : {}),
    ...(composition.layoutLabels
      ? { layoutLabels: composition.layoutLabels }
      : {}),
    ...(motion ? { motion } : {}),
    render: composition.render,
  }
}

function validateChildren(
  parentId: string,
  children: readonly AnyInitializedMark[],
  owner: ComposeInitializedMarksOptions['owner'],
): void {
  const childIds = new Set<string>()
  const resolvedIds = new Map<string, string>()
  for (const child of children) {
    if (child.postDomain) {
      throw new TypeError(
        `${owner} cannot compose child mark "${child.id}" because it has post-domain filtering; wrap the composed mark instead`,
      )
    }
    if (child.resolveLayout) {
      throw new TypeError(
        `${owner} cannot compose child mark "${child.id}" because it has its own layout`,
      )
    }
    if (childIds.has(child.id)) {
      throw new TypeError(
        `${owner} cannot compose duplicate child mark id "${child.id}"`,
      )
    }
    childIds.add(child.id)
    const resolvedId = compositeChildMarkId(parentId, child.id)
    const previousId = resolvedIds.get(resolvedId)
    if (previousId !== undefined) {
      throw new TypeError(
        `${owner} cannot compose child mark ids "${previousId}" and "${child.id}" because both resolve to namespace "${resolvedId}"`,
      )
    }
    resolvedIds.set(resolvedId, child.id)
  }
}

function mergeChildChannels(
  parentId: string,
  children: readonly AnyInitializedMark[],
  options: ComposeInitializedMarksOptions,
): Readonly<Record<string, MaterializedChannel>> {
  const merged: Record<string, MaterializedChannel> = {}

  for (const child of children) {
    for (const [name, channel] of Object.entries(child.channels)) {
      if (
        options.coordinates === 'pixel' &&
        (channel.scale === 'x' || channel.scale === 'y')
      ) {
        validatePixelChannel(child.id, name, channel.scale, channel.values)
        continue
      }

      merged[`${compositeChildMarkId(parentId, child.id)}:${name}`] = channel
    }
  }

  return merged
}

function validatePixelChannel(
  markId: string,
  channelName: string,
  axis: 'x' | 'y',
  values: readonly unknown[],
): void {
  values.forEach((value, index) => {
    if (typeof value === 'number' && Number.isFinite(value)) return
    throw new TypeError(
      `Resolved child mark "${markId}" ${axis} channel "${channelName}" requires finite pixel numbers; received ${String(value)} at index ${index}`,
    )
  })
}

function resolvedPixelScales(
  children: readonly AnyInitializedMark[],
): Readonly<Record<'x' | 'y', ResolvedScale>> {
  const values = { x: [] as number[], y: [] as number[] }
  for (const child of children) {
    for (const channel of Object.values(child.channels)) {
      if (channel.scale !== 'x' && channel.scale !== 'y') continue
      values[channel.scale].push(...(channel.values as readonly number[]))
    }
  }
  return {
    x: pixelScale('x', values.x),
    y: pixelScale('y', values.y),
  }
}

function pixelScale(axis: 'x' | 'y', values: readonly number[]): ResolvedScale {
  const finitePixel = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    throw new TypeError(
      `Resolved child ${axis} scale requires a finite pixel number; received ${String(value)}`,
    )
  }
  return {
    id: axis,
    type: 'identity',
    domain: [...new Set(values)],
    map: finitePixel,
    invert: finitePixel,
    ticks: [],
    bandwidth: 0,
  }
}

function childContext(
  context: MarkRenderContext,
  scales: Readonly<Record<'x' | 'y', ResolvedScale>> | undefined,
  markIndex: number,
): MarkRenderContext {
  return {
    ...context,
    markIndex,
    ...(scales ? { scales: { ...context.scales, ...scales } } : {}),
  }
}

interface ChildNamespace {
  prefix: string
  identity: (value: string) => string
}

function childNamespace(parentId: string, childId: string): ChildNamespace {
  const prefix = compositeChildMarkId(parentId, childId)
  return {
    prefix,
    identity: (value) => {
      if (value === childId) return prefix
      if (value.startsWith(`${childId}:`)) {
        return `${prefix}${value.slice(childId.length)}`
      }
      if (value === prefix || value.startsWith(`${prefix}:`)) return value
      return `${prefix}:${value}`
    },
  }
}

/** Resolves one direct child's stable mark and scene namespace. */
export function compositeChildMarkId(
  parentId: string,
  childId: string,
): string {
  return sceneChildId(parentId, childId)
}

function namespaceLabel(
  label: SceneLabel,
  namespace: ChildNamespace,
): SceneLabel {
  return { ...label, key: namespace.identity(label.key) }
}

function namespaceScene(
  nodes: readonly SceneNode[],
  points: readonly AnyChartPoint[],
  namespace: ChildNamespace,
): { nodes: readonly SceneNode[]; points: readonly AnyChartPoint[] } {
  const mappedPoints = new Map<AnyChartPoint, AnyChartPoint>()
  const mapPoint = (point: AnyChartPoint): AnyChartPoint => {
    const previous = mappedPoints.get(point)
    if (previous) return previous
    const mapped = {
      ...point,
      key: namespace.identity(point.key),
      markId: namespace.identity(point.markId),
    }
    mappedPoints.set(point, mapped)
    return mapped
  }

  return {
    nodes: mapSceneNodes(nodes, namespace, mapPoint),
    points: points.map(mapPoint),
  }
}

function stripSceneInteractions(
  nodes: readonly SceneNode[],
  points: readonly AnyChartPoint[],
  lookup: ScenePointLookup = createScenePointLookup(points),
): readonly SceneNode[] {
  return nodes.map((node): SceneNode => {
    if (node.kind === 'group') {
      const { focus: _focus, states: _states, ...decorative } = node
      const owned = sceneNodeOwnedPoints(node, points, lookup, [])
      return {
        ...decorative,
        children: stripSceneInteractions(
          node.children,
          owned.length ? owned : points,
          lookup,
        ),
      }
    }
    if (node.kind === 'label') return node
    const { interaction: _interaction, ...decorative } = node
    const owned = node.interaction?.point
      ? [node.interaction.point]
      : (node.interaction?.points ??
        sceneNodeOwnedPoints(node, points, lookup, []))
    return owned.length === 1
      ? { ...decorative, pointOwner: owned[0] }
      : decorative
  })
}

function mapSceneNodes(
  nodes: readonly SceneNode[],
  namespace: ChildNamespace,
  mapPoint: (point: AnyChartPoint) => AnyChartPoint,
): readonly SceneNode[] {
  return nodes.map((node): SceneNode => {
    const key = namespace.identity(node.key)
    if (node.kind === 'group') {
      return {
        ...node,
        key,
        ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
        children: mapSceneNodes(node.children, namespace, mapPoint),
        ...(node.focus
          ? {
              focus: {
                ...node.focus,
                points: node.focus.points.map(mapPoint),
                ...(node.focus.candidates
                  ? {
                      candidates: mapSceneNodes(
                        node.focus.candidates,
                        namespace,
                        mapPoint,
                      ),
                    }
                  : {}),
                ...(node.focus.activePoints
                  ? { activePoints: node.focus.activePoints.map(mapPoint) }
                  : {}),
              },
            }
          : {}),
        ...(node.states
          ? {
              states: {
                ...node.states,
                points: node.states.points.map(mapPoint),
              },
            }
          : {}),
      }
    }
    if (node.kind === 'label' || !node.interaction) {
      return {
        ...node,
        key,
        ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
      }
    }
    return {
      ...node,
      key,
      ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
      interaction: node.interaction.point
        ? { ...node.interaction, point: mapPoint(node.interaction.point) }
        : {
            ...node.interaction,
            points: node.interaction.points.map(mapPoint),
          },
    }
  })
}

function collectRenderedPoints(
  scene: MarkScene<any, any, any>,
): readonly AnyChartPoint[] {
  const points = scene.points ? [...scene.points] : []
  const seen = new Set(points)
  const visit = (nodes: readonly SceneNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'group') {
        if (!node.focus) visit(node.children)
        continue
      }
      if (node.kind === 'label' || !node.interaction) continue
      const interaction = node.interaction
      const candidates = interaction.point
        ? [interaction.point]
        : interaction.points
      for (const point of candidates) {
        if (seen.has(point)) continue
        seen.add(point)
        points.push(point)
      }
    }
  }
  visit(scene.nodes)
  return points
}
