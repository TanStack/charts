import { partition as createPartition } from 'd3-hierarchy'
import { pointRadial } from 'd3-shape'
import {
  aggregateFlatHierarchyValues,
  buildFlatHierarchy,
  flatHierarchyAncestorIds,
  flatHierarchyBranchId,
  flatHierarchyNodeContext,
  flatHierarchyNodeValue,
} from './hierarchy-flat-internal'
import { channelValues, isChartKey, isFiniteNumber, visualValue } from './mark'
import { createPolarMark } from './polar-mark-internal'
import { resolvePolarSector } from './polar-sector-internal'
import { valueKey } from './scales'
import type {
  FlatHierarchyDatum,
  FlatHierarchyNode,
  FlatHierarchyOptions,
} from './hierarchy-flat-internal'
import type { PolarLength, PolarMark } from './polar'
import type { PolarLayoutContext } from './polar-mark-internal'
import type { TransformValue } from './transform'
import type {
  Channel,
  ChartKey,
  ChartMarkMotionOptions,
  ChartPoint,
  SceneNode,
  VisualChannel,
} from './types'
import type { HierarchyRectangularNode } from 'd3-hierarchy'

export interface SunburstNode<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly ancestorIds: readonly string[]
  readonly branchId: string | null
  readonly name: string
  readonly data: TDatum | null
  readonly depth: number
  readonly height: number
  readonly internal: boolean
  readonly external: boolean
  readonly value: number
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export type SunburstNodeComparator<TDatum> = (
  left: SunburstNode<TDatum>,
  right: SunburstNode<TDatum>,
) => number

interface SunburstSharedOptions<TDatum> extends ChartMarkMotionOptions<
  SunburstNode<TDatum>
> {
  readonly id?: string
  readonly className?: string
  readonly value: TransformValue<TDatum, number | null | undefined>
  readonly sort?: SunburstNodeComparator<TDatum>
  readonly innerRadius?: PolarLength
  readonly outerRadius?: PolarLength
  /** Fixed pixel gap between adjacent hierarchy rings. Defaults to zero. */
  readonly ringPadding?: number
  readonly z?: Channel<SunburstNode<TDatum>, ChartKey | null | undefined>
  readonly color?: Channel<SunburstNode<TDatum>, ChartKey | null | undefined>
  readonly fill?: VisualChannel<SunburstNode<TDatum>, string>
  readonly fillOpacity?: number
  readonly stroke?: VisualChannel<SunburstNode<TDatum>, string>
  readonly strokeOpacity?: number
  readonly strokeWidth?: number
  readonly strokeDasharray?: string
  readonly opacity?: number
}

export type SunburstPathOptions<TDatum> = SunburstSharedOptions<TDatum> & {
  readonly path: TransformValue<TDatum, string>
  readonly delimiter?: string
  readonly nodeId?: never
  readonly parentId?: never
}

export type SunburstParentOptions<TDatum> = SunburstSharedOptions<TDatum> & {
  readonly nodeId: TransformValue<TDatum, string>
  readonly parentId: TransformValue<TDatum, string | null | undefined>
  readonly path?: never
  readonly delimiter?: never
}

export type SunburstOptions<TDatum> =
  SunburstPathOptions<TDatum> | SunburstParentOptions<TDatum>

/** Lays out and renders a flat hierarchy as responsive polar sectors. */
export function sunburst<
  TDatum,
  const TPath extends TransformValue<TDatum, string>,
>(
  source: Iterable<TDatum>,
  options: SunburstSharedOptions<TDatum> & {
    readonly path: TPath
    readonly delimiter?: string
    readonly nodeId?: never
    readonly parentId?: never
  },
): PolarMark<SunburstNode<TDatum>, number, number>
export function sunburst<
  TDatum,
  const TNodeId extends TransformValue<TDatum, string>,
  const TParentId extends TransformValue<TDatum, string | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: SunburstSharedOptions<TDatum> & {
    readonly nodeId: TNodeId
    readonly parentId: TParentId
    readonly path?: never
    readonly delimiter?: never
  },
): PolarMark<SunburstNode<TDatum>, number, number>
export function sunburst<TDatum>(
  source: Iterable<TDatum>,
  options: SunburstOptions<TDatum>,
): PolarMark<SunburstNode<TDatum>, number, number> {
  const hierarchyOptions: FlatHierarchyOptions<TDatum> =
    options.path !== undefined
      ? { path: options.path, delimiter: options.delimiter }
      : {
          id: (options as SunburstParentOptions<TDatum>).nodeId,
          parentId: (options as SunburstParentOptions<TDatum>).parentId,
        }
  const hierarchy = buildFlatHierarchy(source, hierarchyOptions, 'sunburst')
  aggregateFlatHierarchyValues(hierarchy, options.value, 'sunburst')

  const contexts = new WeakMap<
    FlatHierarchyNode<TDatum>,
    SunburstNode<TDatum>
  >()
  const context = (node: FlatHierarchyNode<TDatum>) => {
    const existing = contexts.get(node)
    if (existing) return existing
    const created = Object.freeze(sunburstNodeContext(node))
    contexts.set(node, created)
    return created
  }
  if (options.sort) {
    hierarchy.root.sort((left, right) => {
      const compared = options.sort!(
        context(left as FlatHierarchyNode<TDatum>),
        context(right as FlatHierarchyNode<TDatum>),
      )
      if (!isFiniteNumber(compared)) {
        throw new TypeError('sunburst: sort result must be finite')
      }
      return compared
    })
  }

  const ringPadding = options.ringPadding ?? 0
  assertNonnegativeFinite(ringPadding, 'ringPadding')
  const ringCount = hierarchy.root.height
  const partitioned = createPartition<FlatHierarchyDatum<TDatum>>().size([
    1,
    Math.max(1, ringCount + 1),
  ])(hierarchy.root) as HierarchyRectangularNode<FlatHierarchyDatum<TDatum>> &
    FlatHierarchyNode<TDatum>
  const nodes = partitioned
    .descendants()
    .slice(1)
    .filter((node) => node.x1 > node.x0)
    .map((node) => ({
      node: context(node as FlatHierarchyNode<TDatum>),
      start: node.x0,
      end: node.x1,
    }))

  return createPolarMark<SunburstNode<TDatum>, number, number>(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:sunburst-${markIndex}`
      const data = nodes.map(({ node }) => node)
      const groups = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? groups
          : channelValues(data, options.color, () => null)

      return {
        id,
        colorValues: colorValues.filter(isChartKey),
        angleValues: [],
        radiusValues: [],
        includeZeroRadius: false,
        requiresAngleScale: false,
        requiresRadiusScale: false,
        render: ({ layout, color: resolveColor }) => {
          const innerRadius = resolveRadius(
            options.innerRadius,
            layout,
            0,
            'innerRadius',
          )
          const outerRadius = resolveRadius(
            options.outerRadius,
            layout,
            layout.radius,
            'outerRadius',
          )
          const span = outerRadius - innerRadius
          const direction = span < 0 ? -1 : 1
          const usableSpan = Math.max(
            0,
            Math.abs(span) - ringPadding * Math.max(0, ringCount - 1),
          )
          const ringSize = ringCount === 0 ? 0 : usableSpan / ringCount
          const angularSpan = layout.endAngle - layout.startAngle
          const children: SceneNode[] = []
          const points: ChartPoint<SunburstNode<TDatum>, number, number>[] = []

          nodes.forEach(({ node, start, end }, nodeIndex) => {
            if (ringSize <= 0) return
            const startAngle = layout.startAngle + start * angularSpan
            const endAngle = layout.startAngle + end * angularSpan
            if (
              !isFiniteNumber(startAngle) ||
              !isFiniteNumber(endAngle) ||
              Math.abs(endAngle - startAngle) <= 1e-12
            ) {
              return
            }
            const ringOffset = (node.depth - 1) * (ringSize + ringPadding)
            const radius1 = innerRadius + direction * ringOffset
            const radius2 = radius1 + direction * ringSize
            const sector = resolvePolarSector({
              startAngle,
              endAngle,
              innerRadius: radius1,
              outerRadius: radius2,
              cornerRadius: 0,
            })
            if (!sector) return

            const group = groups[nodeIndex] ?? null
            const fallback = resolveColor(colorValues[nodeIndex] ?? null)
            const fill = visualValue(
              options.fill,
              node,
              nodeIndex,
              data,
              fallback,
            )
            const stroke =
              options.stroke === undefined
                ? undefined
                : visualValue(options.stroke, node, nodeIndex, data, fallback)
            const key = `${id}:node:${valueKey(node.id)}`
            const angle = (startAngle + endAngle) / 2
            const radius = (radius1 + radius2) / 2
            const [x, y] = pointRadial(angle, radius)
            const point: ChartPoint<SunburstNode<TDatum>, number, number> = {
              key,
              markId: id,
              group,
              groupLabel: group === null ? id : String(group),
              datum: node,
              datumIndex: nodeIndex,
              xValue: angle,
              yValue: radius,
              x: layout.centerX + x,
              y: layout.centerY + y,
              color: fill,
            }
            children.push({
              kind: 'area',
              key,
              points: sector.points,
              path: sector.path,
              interaction: { point, affinity: 'geometry' },
              style: {
                fill,
                fillOpacity: options.fillOpacity,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth,
                strokeDasharray: options.strokeDasharray,
                opacity: options.opacity,
                lineJoin: 'round',
              },
            })
            points.push(point)
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: classes(
                  'ts-chart__arc ts-chart__sunburst',
                  options.className,
                ),
                ariaHidden: true,
                children,
              },
            ],
            points,
          }
        },
      }
    },
    options.motion,
  )
}

function sunburstNodeContext<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): SunburstNode<TDatum> {
  return {
    ...flatHierarchyNodeContext(node),
    ancestorIds: flatHierarchyAncestorIds(node),
    branchId: flatHierarchyBranchId(node),
    value: flatHierarchyNodeValue(node),
  }
}

function resolveRadius(
  value: PolarLength | undefined,
  layout: PolarLayoutContext,
  fallback: number,
  description: string,
): number {
  const resolved = typeof value === 'function' ? value(layout) : value
  const radius = resolved ?? fallback
  assertNonnegativeFinite(radius, description)
  return radius
}

function assertNonnegativeFinite(value: unknown, description: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `sunburst: ${description} must be nonnegative and finite`,
    )
  }
}

function classes(base: string, custom: string | undefined): string {
  return custom ? `${base} ${custom}` : base
}
