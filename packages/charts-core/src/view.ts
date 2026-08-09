import { resolveCompositeChildMotion } from './composite-motion-internal'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { valueKey } from './scales'
import { createChartScene } from './scene'
import { chartSceneSource } from './scene-source'
import { embedChartScene, sceneChildId } from './scene-embed-internal'
import {
  fill,
  getViewLayoutMetadataInternal,
  grid,
  inset,
  layer,
  resolveViewLayoutInternal,
} from './view-layout'
import type {
  ChartMargin,
  ChartDefinition,
  ChartMotionDefinition,
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
  ChartTheme,
  ChartValue,
  ResolvedScale,
  ResponsiveChartDefinition,
  SceneFocusGuide,
  SceneGroup,
  StaticChartDefinition,
} from './types'
import type {
  ResolvedViewFrame,
  ViewAnchor,
  ViewGridCell,
  ViewInsetOptions,
  ViewLayout,
  ViewLayoutPlaced,
  ViewLayoutReferenced,
  ViewTrack,
} from './view-layout'

export { fill, grid, inset, layer }
export type {
  ViewAnchor,
  ViewGridCell,
  ViewInsetOptions,
  ViewLayout,
  ViewTrack,
}

type AnyStaticChartDefinition = StaticChartDefinition<any, any, any>
type AnyChartDefinition = ChartDefinition<any, any, any>

type EmbeddedHostOption =
  | 'maxFocusDistance'
  | 'focus'
  | 'focusRing'
  | 'cursor'
  | 'spatialIndex'
  | 'svgAnimation'
  | 'keyboard'
  | 'pointer'
  | 'selection'
  | 'controls'
  | 'tooltip'
  | 'motion'

type WithoutEmbeddedHostOptions<TDefinition> = Omit<
  TDefinition,
  EmbeddedHostOption
> & {
  [TOption in EmbeddedHostOption]?: never
}

/** A chart definition that can be embedded without creating a second host. */
export type ComposableStaticChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = Omit<
  WithoutEmbeddedHostOptions<StaticChartDefinition<TDatum, TXValue, TYValue>>,
  'gradients' | 'theme'
> & {
  gradients?: readonly []
  theme?: Omit<Partial<ChartTheme>, 'background'> & { background?: never }
}

/** A responsive chart definition whose resolved spec can be embedded in a view. */
export type ComposableResponsiveChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = WithoutEmbeddedHostOptions<
  ResponsiveChartDefinition<TDatum, TXValue, TYValue>
>

export type ComposableChartDefinition<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | ComposableStaticChartDefinition<TDatum, TXValue, TYValue>
  | ComposableResponsiveChartDefinition<TDatum, TXValue, TYValue>

type AnyComposableChartDefinition = ComposableChartDefinition<any, any, any>

export type ViewDefinitions = Readonly<
  Record<string, AnyComposableChartDefinition>
>

export interface ViewLink {
  x?: string
  y?: string
}

export interface ViewGridItem<
  TChart extends AnyComposableChartDefinition = AnyComposableChartDefinition,
  TRow extends string = string,
  TColumn extends string = string,
> {
  id: string
  row: TRow
  column: TColumn
  chart: TChart
  /** Share scale semantics and align the corresponding plot range. */
  share?: ViewLink
  /** Align a plot range without requiring equal scale domains. */
  align?: ViewLink
}

type TrackId<TTracks extends readonly ViewTrack[]> = TTracks[number]['id']

export interface ViewGridOptions<
  TRows extends readonly ViewTrack[] = readonly ViewTrack[],
  TColumns extends readonly ViewTrack[] = readonly ViewTrack[],
  TViews extends readonly ViewGridItem<
    AnyComposableChartDefinition,
    TrackId<TRows>,
    TrackId<TColumns>
  >[] = readonly ViewGridItem<
    AnyComposableChartDefinition,
    TrackId<TRows>,
    TrackId<TColumns>
  >[],
> {
  id?: string
  rows: TRows
  columns: TColumns
  views: TViews
  gap?: number
  rowGap?: number
  columnGap?: number
}

type ViewDefinition<TView> =
  TView extends ViewGridItem<infer TDefinition, any, any> ? TDefinition : never

type DefinitionDatum<TDefinition> = TDefinition extends {
  readonly __datum?: infer TDatum
}
  ? TDatum
  : never

type DefinitionXValue<TDefinition> = TDefinition extends {
  readonly __xValue?: infer TXValue extends ChartValue
}
  ? TXValue
  : never

type DefinitionYValue<TDefinition> = TDefinition extends {
  readonly __yValue?: infer TYValue extends ChartValue
}
  ? TYValue
  : never

type ViewDatum<TViews extends readonly ViewGridItem[]> = DefinitionDatum<
  ViewDefinition<TViews[number]>
>

type ViewXValue<TViews extends readonly ViewGridItem[]> = DefinitionXValue<
  ViewDefinition<TViews[number]>
>

type ViewYValue<TViews extends readonly ViewGridItem[]> = DefinitionYValue<
  ViewDefinition<TViews[number]>
>

type NamedViewId<TViews extends ViewDefinitions> = Extract<keyof TViews, string>
type NamedViewDefinition<TViews extends ViewDefinitions> =
  TViews[NamedViewId<TViews>]
type NamedViewDatum<TViews extends ViewDefinitions> = DefinitionDatum<
  NamedViewDefinition<TViews>
>
type NamedViewXValue<TViews extends ViewDefinitions> = DefinitionXValue<
  NamedViewDefinition<TViews>
>
type NamedViewYValue<TViews extends ViewDefinitions> = DefinitionYValue<
  NamedViewDefinition<TViews>
>

type ValidViewLayout<
  TViews extends ViewDefinitions,
  TLayout extends ViewLayout<any, any>,
> = [Exclude<ViewLayoutPlaced<TLayout>, NamedViewId<TViews>>] extends [never]
  ? [Exclude<ViewLayoutReferenced<TLayout>, NamedViewId<TViews>>] extends [
      never,
    ]
    ? [Exclude<NamedViewId<TViews>, ViewLayoutPlaced<TLayout>>] extends [never]
      ? unknown
      : never
    : never
  : never

export type ViewAxis = 'x' | 'y'
export type ViewScaleLinkMode = 'share' | 'align'

export interface ViewScaleLink<TView extends string = string> {
  readonly source: TView
  readonly target: TView
  readonly axis: ViewAxis
  readonly mode: ViewScaleLinkMode
}

export interface ComposeViewsOptions<
  TViews extends ViewDefinitions = ViewDefinitions,
  TLayout extends ViewLayout<any, any> = ViewLayout<any, any>,
> {
  id?: string
  views: TViews
  layout: TLayout
  links?: readonly ViewScaleLink<NamedViewId<NoInfer<TViews>>>[]
}

export function shareX<
  const TSource extends string,
  const TTarget extends string,
>(source: TSource, target: TTarget): ViewScaleLink<TSource | TTarget> {
  return viewScaleLink('share', 'x', source, target)
}

export function shareY<
  const TSource extends string,
  const TTarget extends string,
>(source: TSource, target: TTarget): ViewScaleLink<TSource | TTarget> {
  return viewScaleLink('share', 'y', source, target)
}

export function alignX<
  const TSource extends string,
  const TTarget extends string,
>(source: TSource, target: TTarget): ViewScaleLink<TSource | TTarget> {
  return viewScaleLink('align', 'x', source, target)
}

export function alignY<
  const TSource extends string,
  const TTarget extends string,
>(source: TSource, target: TTarget): ViewScaleLink<TSource | TTarget> {
  return viewScaleLink('align', 'y', source, target)
}

function viewScaleLink<TSource extends string, TTarget extends string>(
  mode: ViewScaleLinkMode,
  axis: ViewAxis,
  source: TSource,
  target: TTarget,
): ViewScaleLink<TSource | TTarget> {
  const sourceId = source.trim()
  const targetId = target.trim()
  if (!sourceId || !targetId) {
    throw new TypeError(
      'View scale links require nonempty source and target ids',
    )
  }
  return {
    mode,
    axis,
    source: sourceId,
    target: targetId,
  } as ViewScaleLink<TSource | TTarget>
}

interface PreparedView {
  id: string
  chart: AnyChartDefinition
}

interface CompiledView {
  view: PreparedView
  bounds: ResolvedViewFrame
  scene: ChartScene
}

interface AxisLink {
  source: PreparedView
  target: PreparedView
  axis: ViewAxis
  shared: boolean
}

const layoutPassLimit = 4
const layoutTolerance = 0.25

interface PreparedComposition {
  views: readonly PreparedView[]
  links: readonly AxisLink[]
  alignmentGroups: Readonly<Record<ViewAxis, readonly number[][]>>
}

/** Composes named complete chart definitions through one deterministic layout. */
export function composeViews<
  const TViews extends ViewDefinitions,
  const TLayout extends ViewLayout<any, any>,
>(
  options: ComposeViewsOptions<TViews, TLayout> & {
    layout: TLayout & ValidViewLayout<NoInfer<TViews>, TLayout>
  },
): StaticChartDefinition<
  NamedViewDatum<TViews>,
  NamedViewXValue<TViews>,
  NamedViewYValue<TViews>
> &
  ComposableStaticChartDefinition<
    NamedViewDatum<TViews>,
    NamedViewXValue<TViews>,
    NamedViewYValue<TViews>
  > {
  const id = compositionId(options.id, 'composeViews', 'view-composition-0')
  const prepared = prepareComposition(
    options.views,
    options.layout,
    options.links ?? [],
    id,
  )
  return createViewComposition<
    NamedViewDatum<TViews>,
    NamedViewXValue<TViews>,
    NamedViewYValue<TViews>
  >(id, options.layout, prepared)
}

/** Convenience syntax for non-overlapping row and column view composition. */
export function viewGrid<
  const TRows extends readonly ViewTrack[],
  const TColumns extends readonly ViewTrack[],
  const TViews extends readonly ViewGridItem<
    AnyComposableChartDefinition,
    TrackId<TRows>,
    TrackId<TColumns>
  >[],
>(
  options: ViewGridOptions<TRows, TColumns, TViews>,
): StaticChartDefinition<
  ViewDatum<TViews>,
  ViewXValue<TViews>,
  ViewYValue<TViews>
> &
  ComposableStaticChartDefinition<
    ViewDatum<TViews>,
    ViewXValue<TViews>,
    ViewYValue<TViews>
  > {
  const id = compositionId(options.id, 'viewGrid', 'view-grid-0')
  const lowered = lowerViewGrid(options)
  const prepared = prepareComposition(
    lowered.views,
    lowered.layout,
    lowered.links,
    id,
  )
  return createViewComposition<
    ViewDatum<TViews>,
    ViewXValue<TViews>,
    ViewYValue<TViews>
  >(id, lowered.layout, prepared)
}

function createViewComposition<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  id: string,
  viewLayout: ViewLayout<any, any>,
  prepared: PreparedComposition,
): ComposableStaticChartDefinition<TDatum, TXValue, TYValue> {
  const childMotions = new Map<string, ChartMotionDefinition<any>>()
  const mark = createMarkWithScaleValues<
    TDatum,
    TXValue,
    TYValue,
    never,
    never
  >(
    () => {
      return {
        id,
        channels: {},
        render: ({ chart, theme, layout }) => {
          const resolvedFrames = resolveViewLayoutInternal(viewLayout, chart)
          const frameById = new Map(
            resolvedFrames.map((frame) => [frame.id, frame]),
          )
          const bounds = prepared.views.map((view, index) => {
            const frame = frameById.get(view.id)
            if (!frame) {
              throw new TypeError(
                `View composition "${id}" did not resolve child "${view.id}"`,
              )
            }
            if (frame.order !== index) {
              throw new TypeError(
                `View composition "${id}" resolved an unstable paint order for child "${view.id}"`,
              )
            }
            return frame
          })
          assertLinkedFrames(id, prepared.views, prepared.links, bounds)
          const definitions = prepared.views.map((view, index) =>
            resolveChildDefinition(view, bounds[index]!, theme),
          )
          const marginLocks = prepared.views.map(
            () => ({}) as Partial<ChartMargin>,
          )
          let compiled = compileViews(
            id,
            prepared.views,
            definitions,
            bounds,
            marginLocks,
            layout,
          )

          for (let pass = 0; pass < layoutPassLimit; pass += 1) {
            const next = alignedMargins(
              id,
              compiled,
              prepared.alignmentGroups,
              marginLocks,
            )
            if (sameMarginLocks(marginLocks, next)) break
            next.forEach((margin, index) => {
              marginLocks[index] = margin
            })
            compiled = compileViews(
              id,
              prepared.views,
              definitions,
              bounds,
              marginLocks,
              layout,
            )
          }

          assertAlignedRanges(id, compiled, prepared.alignmentGroups)
          assertSharedScales(id, compiled, prepared.links)
          childMotions.clear()

          const points: ChartPoint<TDatum, TXValue, TYValue>[] = []
          const focusGuides: SceneFocusGuide[] = []
          const children = compiled.map(({ view, bounds: cell, scene }) => {
            collectChildMotions(id, view.id, scene, childMotions)
            const embedded = embedChartScene(scene, {
              ownerId: id,
              childId: view.id,
              x: cell.x,
              y: cell.y,
            })
            points.push(
              ...(embedded.points as readonly ChartPoint<
                TDatum,
                TXValue,
                TYValue
              >[]),
            )
            focusGuides.push(...embedded.focusGuides)
            return {
              kind: 'group' as const,
              key: `${sceneChildId(id, view.id)}:view`,
              className: 'ts-chart__view',
              translateX: cell.x,
              translateY: cell.y,
              clip: { x: 0, y: 0, width: cell.width, height: cell.height },
              children: embedded.nodes,
            }
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__views',
                children,
              },
            ],
            points,
            ...(focusGuides.length ? { focusGuides } : {}),
          }
        },
      }
    },
    (context) => resolveCompositeChildMotion(undefined, childMotions, context),
  )

  return {
    marks: [mark],
    guides: false,
    margin: 0,
    x: null,
    y: null,
  }
}

function lowerViewGrid(options: ViewGridOptions): {
  views: ViewDefinitions
  layout: ViewLayout<string, never>
  links: readonly ViewScaleLink<string>[]
} {
  if (!options.views.length) {
    throw new TypeError('viewGrid requires at least one view')
  }
  const views: Record<string, AnyComposableChartDefinition> = {}
  const cells: Record<string, ViewGridCell> = {}
  const items = new Map<string, ViewGridItem>()
  for (const view of options.views) {
    const id = view.id.trim()
    if (!id) throw new TypeError('viewGrid view ids cannot be empty')
    if (items.has(id)) {
      throw new TypeError(`viewGrid contains duplicate view id "${id}"`)
    }
    items.set(id, view)
    views[id] = view.chart
    cells[id] = { row: view.row, column: view.column }
  }

  const links: ViewScaleLink<string>[] = []
  for (const [id, view] of items) {
    for (const axis of ['x', 'y'] as const) {
      const sharedTarget = view.share?.[axis]
      const alignedTarget = view.align?.[axis]
      if (sharedTarget && alignedTarget) {
        throw new TypeError(
          `View "${id}" cannot set both share.${axis} and align.${axis}; sharing already aligns the range`,
        )
      }
      const targetId = sharedTarget ?? alignedTarget
      if (!targetId) continue
      const target = items.get(targetId)
      if (!target) {
        throw new TypeError(
          `View "${id}" ${sharedTarget ? 'share' : 'align'}.${axis} references unknown view "${targetId}"`,
        )
      }
      if (
        (axis === 'x' && view.column !== target.column) ||
        (axis === 'y' && view.row !== target.row)
      ) {
        throw new TypeError(
          `View "${id}" can link ${axis} only to a view in the same ${
            axis === 'x' ? 'column' : 'row'
          } track`,
        )
      }
      links.push({
        source: id,
        target: targetId,
        axis,
        mode: sharedTarget ? 'share' : 'align',
      })
    }
  }

  return {
    views,
    layout: grid({
      rows: options.rows as readonly [ViewTrack, ...ViewTrack[]],
      columns: options.columns as readonly [ViewTrack, ...ViewTrack[]],
      cells,
      ...(options.gap === undefined ? {} : { gap: options.gap }),
      ...(options.rowGap === undefined ? {} : { rowGap: options.rowGap }),
      ...(options.columnGap === undefined
        ? {}
        : { columnGap: options.columnGap }),
    }),
    links,
  }
}

function prepareComposition(
  definitions: ViewDefinitions,
  layout: ViewLayout<any, any>,
  authoredLinks: readonly ViewScaleLink<string>[],
  ownerId: string,
): PreparedComposition {
  const entries = Object.entries(definitions)
  if (!entries.length) {
    throw new TypeError('composeViews requires at least one named view')
  }
  const byId = new Map<string, PreparedView>()
  const namespaces = new Map<string, string>()
  for (const [authoredId, chart] of entries) {
    const id = authoredId.trim()
    if (!id) throw new TypeError('composeViews view ids cannot be empty')
    if (byId.has(id)) {
      throw new TypeError(`composeViews contains duplicate view id "${id}"`)
    }
    assertChildDefinition(id, chart)
    const view = { id, chart }
    byId.set(id, view)
    const namespace = sceneChildId(ownerId, id)
    const existingNamespace = namespaces.get(namespace)
    if (existingNamespace) {
      throw new TypeError(
        `Views "${existingNamespace}" and "${id}" resolve to the same scene namespace "${namespace}"`,
      )
    }
    namespaces.set(namespace, id)
  }

  const metadata = getViewLayoutMetadataInternal(layout)
  const placed = new Set<string>()
  for (const id of metadata.placed) {
    if (placed.has(id)) {
      throw new TypeError(`View layout places "${id}" more than once`)
    }
    placed.add(id)
    if (!byId.has(id)) {
      throw new TypeError(`View layout places unknown view "${id}"`)
    }
  }
  for (const id of metadata.referenced) {
    if (!byId.has(id)) {
      throw new TypeError(`View layout references unknown view "${id}"`)
    }
  }
  for (const id of byId.keys()) {
    if (!placed.has(id)) {
      throw new TypeError(`View layout does not place named view "${id}"`)
    }
  }
  const views = metadata.placed.map((id) => byId.get(id)!)

  const links: AxisLink[] = []
  const linkedAxes = new Set<string>()
  for (const authored of authoredLinks) {
    if (authored.axis !== 'x' && authored.axis !== 'y') {
      throw new TypeError(
        `View scale link requires axis "x" or "y"; received "${String(authored.axis)}"`,
      )
    }
    if (authored.mode !== 'share' && authored.mode !== 'align') {
      throw new TypeError(
        `View scale link requires mode "share" or "align"; received "${String(authored.mode)}"`,
      )
    }
    const source = byId.get(authored.source)
    const target = byId.get(authored.target)
    if (!source || !target) {
      throw new TypeError(
        `View ${authored.mode}.${authored.axis} link references unknown ${
          source ? 'target' : 'source'
        } view "${source ? authored.target : authored.source}"`,
      )
    }
    if (source === target) {
      throw new TypeError(
        `View "${source.id}" cannot link its ${authored.axis} range to itself`,
      )
    }
    const identity = `${source.id}:${authored.axis}`
    if (linkedAxes.has(identity)) {
      throw new TypeError(
        `View "${source.id}" has more than one ${authored.axis} scale link`,
      )
    }
    linkedAxes.add(identity)
    links.push({
      source,
      target,
      axis: authored.axis,
      shared: authored.mode === 'share',
    })
  }
  assertAcyclicLinks(views, links)

  return {
    views,
    links,
    alignmentGroups: {
      x: linkedGroups(views, links, 'x'),
      y: linkedGroups(views, links, 'y'),
    },
  }
}

function compositionId(
  authored: string | undefined,
  factory: string,
  fallback: string,
): string {
  const id = authored?.trim() || fallback
  if (authored !== undefined && !authored.trim()) {
    throw new TypeError(`${factory} id cannot be empty`)
  }
  return id
}

function assertChildDefinition(
  id: string,
  definition: AnyChartDefinition,
): void {
  if (
    !definition ||
    typeof definition !== 'object' ||
    (!('chart' in definition) && !Array.isArray(definition.marks))
  ) {
    throw new TypeError(`View "${id}" requires a chart definition`)
  }
  const hostOptions = [
    'maxFocusDistance',
    'focus',
    'focusRing',
    'cursor',
    'spatialIndex',
    'svgAnimation',
    'keyboard',
    'pointer',
    'selection',
    'controls',
    'tooltip',
    'motion',
  ] as const
  const hostOption = hostOptions.find(
    (option) => definition[option] !== undefined,
  )
  if (hostOption) {
    throw new TypeError(
      `View "${id}" cannot own chart host option "${hostOption}"; configure it on the outer definition`,
    )
  }
  if ('chart' in definition) return
  if (definition.gradients?.length) {
    throw new TypeError(
      `View "${id}" cannot embed gradients until child scene resources can be adopted by the outer scene`,
    )
  }
  if (definition.theme?.background !== undefined) {
    throw new TypeError(
      `View "${id}" cannot own a scene background; use an ordinary background mark inside the child definition`,
    )
  }
  for (const axis of ['x', 'y'] as const) {
    const configured = definition[axis]
    const presentation =
      !configured || configured.axis === false
        ? undefined
        : (configured.axis ?? {})
    if (
      presentation?.motion !== undefined ||
      (presentation?.ticks && presentation.ticks.motion !== undefined) ||
      (presentation?.tickLabels &&
        presentation.tickLabels.motion !== undefined) ||
      (typeof presentation?.label === 'object' &&
        presentation.label.motion !== undefined)
    ) {
      throw new TypeError(
        `View "${id}" cannot own ${axis}-guide motion; configure guide motion on a non-embedded chart`,
      )
    }
  }
}

function resolveChildDefinition(
  view: PreparedView,
  frame: ResolvedViewFrame,
  theme: ChartTheme,
): AnyStaticChartDefinition {
  const definition = view.chart
  const resolved =
    'chart' in definition
      ? (() => {
          const { chart, ...options } = definition
          return {
            ...chart({
              width: frame.width,
              height: frame.height,
              defaultTheme: theme,
            }),
            ...options,
          } as AnyStaticChartDefinition
        })()
      : definition
  assertChildDefinition(view.id, resolved)
  return mergeTheme(resolved, theme)
}

function compileViews(
  ownerId: string,
  views: readonly PreparedView[],
  definitions: readonly AnyStaticChartDefinition[],
  bounds: readonly ResolvedViewFrame[],
  locks: readonly Partial<ChartMargin>[],
  layout: Parameters<typeof createChartScene>[2],
): CompiledView[] {
  return views.map((view, index) => {
    const cell = bounds[index]!
    try {
      const scene = createChartScene(
        withMarginLocks(definitions[index]!, locks[index]!),
        { width: cell.width, height: cell.height },
        layout,
      )
      if (scene.controls?.length) {
        throw new TypeError(
          `View "${view.id}" cannot own host controls; configure controlled behaviors and interactive legends on the outer definition`,
        )
      }
      return {
        view,
        bounds: cell,
        scene,
      }
    } catch (error) {
      throw new TypeError(
        `View composition "${ownerId}" child "${view.id}" could not compile: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      )
    }
  })
}

function assertLinkedFrames(
  ownerId: string,
  views: readonly PreparedView[],
  links: readonly AxisLink[],
  bounds: readonly ResolvedViewFrame[],
): void {
  const byId = new Map(
    views.map((view, index) => [view.id, bounds[index]!] as const),
  )
  for (const link of links) {
    const source = byId.get(link.source.id)!
    const target = byId.get(link.target.id)!
    const sourceStart = link.axis === 'x' ? source.x : source.y
    const targetStart = link.axis === 'x' ? target.x : target.y
    const sourceSize = link.axis === 'x' ? source.width : source.height
    const targetSize = link.axis === 'x' ? target.width : target.height
    if (
      Math.abs(sourceStart - targetStart) > layoutTolerance ||
      Math.abs(sourceSize - targetSize) > layoutTolerance
    ) {
      throw new TypeError(
        `View composition "${ownerId}" cannot link ${link.axis} between "${link.source.id}" and "${link.target.id}" because their allocated ${
          link.axis === 'x' ? 'horizontal' : 'vertical'
        } frames differ`,
      )
    }
  }
}

function withMarginLocks(
  definition: AnyStaticChartDefinition,
  locks: Partial<ChartMargin>,
): AnyStaticChartDefinition {
  if (!Object.keys(locks).length) return definition
  const authored =
    typeof definition.margin === 'number'
      ? {
          top: definition.margin,
          right: definition.margin,
          bottom: definition.margin,
          left: definition.margin,
        }
      : (definition.margin ?? {})
  return { ...definition, margin: { ...authored, ...locks } }
}

function alignedMargins(
  ownerId: string,
  compiled: readonly CompiledView[],
  groups: Readonly<Record<'x' | 'y', readonly number[][]>>,
  current: readonly Partial<ChartMargin>[],
): Partial<ChartMargin>[] {
  const next = current.map((margin) => ({ ...margin }))
  for (const indexes of groups.x) {
    const left = Math.max(
      ...indexes.map(
        (index) => compiled[index]!.bounds.x + compiled[index]!.scene.chart.x,
      ),
    )
    const right = Math.min(
      ...indexes.map((index) => {
        const entry = compiled[index]!
        return entry.bounds.x + entry.scene.chart.x + entry.scene.chart.width
      }),
    )
    if (right - left < 1) {
      throw new TypeError(
        `View composition "${ownerId}" cannot align x ranges because linked margins leave no shared plot width`,
      )
    }
    for (const index of indexes) {
      const entry = compiled[index]!
      next[index]!.left = Math.max(0, left - entry.bounds.x)
      next[index]!.right = Math.max(
        0,
        entry.bounds.x + entry.bounds.width - right,
      )
    }
  }
  for (const indexes of groups.y) {
    const top = Math.max(
      ...indexes.map(
        (index) => compiled[index]!.bounds.y + compiled[index]!.scene.chart.y,
      ),
    )
    const bottom = Math.min(
      ...indexes.map((index) => {
        const entry = compiled[index]!
        return entry.bounds.y + entry.scene.chart.y + entry.scene.chart.height
      }),
    )
    if (bottom - top < 1) {
      throw new TypeError(
        `View composition "${ownerId}" cannot align y ranges because linked margins leave no shared plot height`,
      )
    }
    for (const index of indexes) {
      const entry = compiled[index]!
      next[index]!.top = Math.max(0, top - entry.bounds.y)
      next[index]!.bottom = Math.max(
        0,
        entry.bounds.y + entry.bounds.height - bottom,
      )
    }
  }
  return next
}

function assertAlignedRanges(
  ownerId: string,
  compiled: readonly CompiledView[],
  groups: Readonly<Record<'x' | 'y', readonly number[][]>>,
): void {
  for (const axis of ['x', 'y'] as const) {
    for (const indexes of groups[axis]) {
      const first = globalPlotRange(compiled[indexes[0]!]!, axis)
      for (const index of indexes.slice(1)) {
        const current = globalPlotRange(compiled[index]!, axis)
        if (
          Math.abs(first[0] - current[0]) > layoutTolerance ||
          Math.abs(first[1] - current[1]) > layoutTolerance
        ) {
          throw new TypeError(
            `View composition "${ownerId}" could not converge linked ${axis} plot ranges`,
          )
        }
      }
    }
  }
}

function assertSharedScales(
  ownerId: string,
  compiled: readonly CompiledView[],
  links: readonly AxisLink[],
): void {
  const byId = new Map(compiled.map((entry) => [entry.view.id, entry]))
  for (const link of links) {
    if (!link.shared) continue
    const source = byId.get(link.source.id)!
    const target = byId.get(link.target.id)!
    const left = source.scene.scales[link.axis]!
    const right = target.scene.scales[link.axis]!
    const reason = incompatibleScaleReason(
      source,
      target,
      link.axis,
      left,
      right,
    )
    if (reason) {
      throw new TypeError(
        `View composition "${ownerId}" child "${source.view.id}" cannot share ${link.axis} with "${target.view.id}": ${reason}`,
      )
    }
  }
}

function incompatibleScaleReason(
  leftView: CompiledView,
  rightView: CompiledView,
  axis: 'x' | 'y',
  left: ResolvedScale,
  right: ResolvedScale,
): string | undefined {
  if (!left.domain.length || !right.domain.length) {
    return 'both views must configure and materialize that scale'
  }
  if (left.type !== right.type) {
    return `resolved scale types differ (${left.type} versus ${right.type})`
  }
  if (!sameValues(left.domain, right.domain)) {
    return 'resolved domains differ; configure one explicit shared domain'
  }
  if (Math.abs(left.bandwidth - right.bandwidth) > layoutTolerance) {
    return 'resolved bandwidths differ'
  }
  for (const value of scaleProbes(left, right)) {
    const leftPosition = globalScalePosition(leftView, axis, left, value)
    const rightPosition = globalScalePosition(rightView, axis, right, value)
    if (
      Number.isFinite(leftPosition) &&
      Number.isFinite(rightPosition) &&
      Math.abs(leftPosition - rightPosition) > layoutTolerance
    ) {
      return `resolved mappings differ at ${String(value)}`
    }
  }
  return undefined
}

function scaleProbes(
  left: ResolvedScale,
  right: ResolvedScale,
): readonly ChartValue[] {
  const values: ChartValue[] = [
    ...left.domain,
    ...left.ticks.map((tick) => tick.value),
    ...right.ticks.map((tick) => tick.value),
  ]
  const first = left.domain[0]
  const last = left.domain.at(-1)
  if (typeof first === 'number' && typeof last === 'number') {
    for (const ratio of [0.25, 0.5, 0.75]) {
      values.push(first + (last - first) * ratio)
    }
  } else if (first instanceof Date && last instanceof Date) {
    for (const ratio of [0.25, 0.5, 0.75]) {
      values.push(
        new Date(first.getTime() + (last.getTime() - first.getTime()) * ratio),
      )
    }
  }
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = valueKey(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function globalScalePosition(
  view: CompiledView,
  axis: 'x' | 'y',
  scale: ResolvedScale,
  value: ChartValue,
): number {
  return (axis === 'x' ? view.bounds.x : view.bounds.y) + scale.map(value)
}

function globalPlotRange(
  entry: CompiledView,
  axis: 'x' | 'y',
): readonly [number, number] {
  return axis === 'x'
    ? [
        entry.bounds.x + entry.scene.chart.x,
        entry.bounds.x + entry.scene.chart.x + entry.scene.chart.width,
      ]
    : [
        entry.bounds.y + entry.scene.chart.y,
        entry.bounds.y + entry.scene.chart.y + entry.scene.chart.height,
      ]
}

function linkedGroups(
  views: readonly PreparedView[],
  links: readonly AxisLink[],
  axis: 'x' | 'y',
): number[][] {
  const parents = views.map((_view, index) => index)
  const find = (index: number): number => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]!]!
      index = parents[index]!
    }
    return index
  }
  const join = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const indexById = new Map(views.map((view, index) => [view.id, index]))
  for (const link of links) {
    if (link.axis !== axis) continue
    join(indexById.get(link.source.id)!, indexById.get(link.target.id)!)
  }
  const groups = new Map<number, number[]>()
  views.forEach((_view, index) => {
    const root = find(index)
    const group = groups.get(root)
    if (group) group.push(index)
    else groups.set(root, [index])
  })
  return [...groups.values()].filter((group) => group.length > 1)
}

function assertAcyclicLinks(
  views: readonly PreparedView[],
  links: readonly AxisLink[],
): void {
  for (const axis of ['x', 'y'] as const) {
    const targetBySource = new Map(
      links
        .filter((link) => link.axis === axis)
        .map((link) => [link.source.id, link.target.id]),
    )
    const complete = new Set<string>()
    const active = new Set<string>()
    const visit = (id: string) => {
      if (complete.has(id)) return
      if (active.has(id)) {
        throw new TypeError(
          `View composition contains a cycle in ${axis} links at "${id}"`,
        )
      }
      active.add(id)
      const target = targetBySource.get(id)
      if (target) visit(target)
      active.delete(id)
      complete.add(id)
    }
    views.forEach((view) => visit(view.id))
  }
}

function collectChildMotions(
  ownerId: string,
  viewId: string,
  scene: ChartScene,
  motions: Map<string, ChartMotionDefinition<any>>,
): void {
  const source = (
    scene as ChartScene & {
      [chartSceneSource]?: readonly [
        AnyStaticChartDefinition,
        readonly { id: string; motion?: ChartMotionDefinition<any> }[],
      ]
    }
  )[chartSceneSource]
  if (!source) return
  const [definition, initialized] = source
  const viewNamespace = sceneChildId(ownerId, viewId)
  initialized.forEach((mark, index) => {
    const motion = mark.motion ?? definition.marks[index]?.motion
    if (motion !== undefined) {
      motions.set(sceneChildId(viewNamespace, mark.id), motion)
    }
  })
}

function mergeTheme(
  definition: AnyStaticChartDefinition,
  theme: ChartTheme,
): AnyStaticChartDefinition {
  return {
    ...definition,
    theme: {
      ...theme,
      ...definition.theme,
      palette: definition.theme?.palette ?? theme.palette,
    },
  }
}

function sameMarginLocks(
  left: readonly Partial<ChartMargin>[],
  right: readonly Partial<ChartMargin>[],
): boolean {
  return left.every((margin, index) => {
    const candidate = right[index]!
    return (['top', 'right', 'bottom', 'left'] as const).every(
      (side) =>
        margin[side] === candidate[side] ||
        Math.abs((margin[side] ?? 0) - (candidate[side] ?? 0)) <=
          layoutTolerance,
    )
  })
}

function sameValues(
  left: readonly ChartValue[],
  right: readonly ChartValue[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => valueKey(value) === valueKey(right[index]!))
  )
}
