const viewLayoutBrand: unique symbol = Symbol('tanstack-view-layout-brand')
const viewLayoutRecord: unique symbol = Symbol('tanstack-view-layout-record')

/** An opaque, deterministic placement plan for named chart views. */
export interface ViewLayout<
  TPlaced extends string = string,
  TReferenced extends string = never,
> {
  readonly [viewLayoutBrand]: {
    readonly placed: TPlaced
    readonly referenced: TReferenced
  }
}

export type ViewLayoutPlaced<TLayout extends ViewLayout<any, any>> =
  TLayout extends ViewLayout<infer TPlaced, any> ? TPlaced : never

export type ViewLayoutReferenced<TLayout extends ViewLayout<any, any>> =
  TLayout extends ViewLayout<any, infer TReferenced> ? TReferenced : never

export type ViewTrack<TId extends string = string> =
  | {
      readonly id: TId
      readonly size: number
      readonly grow?: never
      readonly min?: never
      readonly max?: never
    }
  | {
      readonly id: TId
      readonly grow: number
      readonly min?: number
      readonly max?: number
      readonly size?: never
    }

export type ViewAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'center'

export interface ViewInsetOptions<TReference extends string = string> {
  relativeTo: TReference
  anchor: ViewAnchor
  width: number
  height: number
  /** Distance from the referenced view's edges. Shrinks with the inset. */
  offset?: number
}

export interface ViewGridCell<
  TRow extends string = string,
  TColumn extends string = string,
> {
  readonly row: TRow
  readonly column: TColumn
}

export interface ViewLayoutBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ResolvedViewFrame extends ViewLayoutBounds {
  id: string
  /** Paint and focus order, starting at zero. */
  order: number
}

export interface ViewLayoutMetadata {
  placed: readonly string[]
  referenced: readonly string[]
}

type AnyViewLayout = ViewLayout<any, any>
type NonEmpty<T> = readonly [T, ...T[]]
type TrackId<TTracks extends readonly ViewTrack[]> = TTracks[number]['id']

interface ResolutionState {
  frames: Map<string, ResolvedViewFrame>
  ordered: ResolvedViewFrame[]
}

type ViewLayoutResolver = (
  bounds: ViewLayoutBounds,
  state: ResolutionState,
) => void

interface ViewLayoutRecord {
  placed: readonly string[]
  referenced: readonly string[]
  resolve: ViewLayoutResolver
}

interface StoredViewLayout extends ViewLayout<string, string> {
  readonly [viewLayoutRecord]: ViewLayoutRecord
}

/** Fills the current layout bounds with one complete chart view. */
export function fill<const TView extends string>(
  view: TView,
): ViewLayout<TView, never> {
  const id = validId(view, 'fill view')
  return createLayout([id], [], (bounds, state) => {
    placeFrame(id, bounds, state)
  })
}

/** Places one chart view inside a previously resolved view frame. */
export function inset<
  const TView extends string,
  const TReference extends string,
>(
  view: TView,
  options: ViewInsetOptions<TReference>,
): ViewLayout<TView, TReference> {
  const resolvedView = validId(view, 'inset view')
  const relativeTo = validId(options.relativeTo, 'inset relativeTo')
  if (resolvedView === relativeTo) {
    throw new TypeError(`View inset "${resolvedView}" cannot reference itself`)
  }
  const placement: InsetPlacement = {
    relativeTo,
    anchor: validAnchor(options.anchor),
    width: positiveFinite(options.width, 'View inset width'),
    height: positiveFinite(options.height, 'View inset height'),
    offset: nonNegativeFinite(options.offset ?? 0, 'View inset offset'),
  }
  return createLayout([resolvedView], [relativeTo], (_bounds, state) => {
    const target = state.frames.get(relativeTo)
    if (!target) {
      throw new TypeError(
        `View inset "${resolvedView}" cannot resolve "${relativeTo}"; inset references must target an earlier resolved view and may not form a cycle`,
      )
    }
    placeFrame(resolvedView, resolveInset(placement, target), state)
  })
}

/** Resolves child layouts in paint order against the same outer bounds. */
export function layer<const TLayouts extends NonEmpty<AnyViewLayout>>(
  ...layouts: TLayouts
): ViewLayout<
  ViewLayoutPlaced<TLayouts[number]>,
  ViewLayoutReferenced<TLayouts[number]>
> {
  if (!layouts.length) throw new TypeError('layer requires at least one layout')
  const children = layouts.map(layoutRecordOf)
  return createLayout(
    children.flatMap((child) => child.placed),
    unique(children.flatMap((child) => child.referenced)),
    (bounds, state) => {
      children.forEach((child) => child.resolve(bounds, state))
    },
  )
}

type CheckedCells<
  TRows extends readonly ViewTrack[],
  TColumns extends readonly ViewTrack[],
  TCells extends Readonly<Record<string, ViewGridCell>>,
> = {
  readonly [TView in keyof TCells]: ViewGridCell<
    TrackId<TRows>,
    TrackId<TColumns>
  >
}

/** Places named chart views in non-overlapping fixed and flexible tracks. */
export function grid<
  const TRows extends NonEmpty<ViewTrack>,
  const TColumns extends NonEmpty<ViewTrack>,
  const TCells extends Readonly<Record<string, ViewGridCell>>,
>(options: {
  rows: TRows
  columns: TColumns
  cells: TCells &
    CheckedCells<NoInfer<TRows>, NoInfer<TColumns>, TCells> &
    (keyof TCells extends never ? never : unknown)
  gap?: number
  rowGap?: number
  columnGap?: number
}): ViewLayout<Extract<keyof TCells, string>, never> {
  const rows = validateTracks(options.rows, 'row')
  const columns = validateTracks(options.columns, 'column')
  const gap = nonNegativeFinite(options.gap ?? 12, 'View grid gap')
  const rowGap = nonNegativeFinite(options.rowGap ?? gap, 'View grid rowGap')
  const columnGap = nonNegativeFinite(
    options.columnGap ?? gap,
    'View grid columnGap',
  )
  const cells = Object.entries(options.cells)
  if (!cells.length) throw new TypeError('grid requires at least one cell')

  const viewIds = new Set<string>()
  const occupied = new Map<string, string>()
  const prepared = cells.map(([authoredView, cell]) => {
    const view = validId(authoredView, 'grid view')
    if (viewIds.has(view)) {
      throw new TypeError(`View grid contains duplicate view id "${view}"`)
    }
    viewIds.add(view)
    const row = validId(cell.row, `View grid "${view}" row`)
    const column = validId(cell.column, `View grid "${view}" column`)
    if (!rows.indexes.has(row)) {
      throw new TypeError(
        `View grid "${view}" references unknown row track "${row}"`,
      )
    }
    if (!columns.indexes.has(column)) {
      throw new TypeError(
        `View grid "${view}" references unknown column track "${column}"`,
      )
    }
    const coordinate = `${row}:${column}`
    const existing = occupied.get(coordinate)
    if (existing) {
      throw new TypeError(
        `Views "${existing}" and "${view}" occupy the same grid cell`,
      )
    }
    occupied.set(coordinate, view)
    return { view, row, column }
  })

  const placement: GridPlacement = {
    rows: rows.tracks,
    columns: columns.tracks,
    cells: prepared,
    rowGap,
    columnGap,
  }
  return createLayout(
    prepared.map((cell) => cell.view),
    [],
    (bounds, state) => resolveGrid(placement, bounds, state),
  )
}

/** @internal Returns authored placement and dependency IDs without resolving frames. */
export function getViewLayoutMetadataInternal(
  layout: AnyViewLayout,
): ViewLayoutMetadata {
  const record = layoutRecordOf(layout)
  return {
    // Preserve duplicate placements so composition can reject them before
    // scene compilation. Repeated references are valid and need no ordering.
    placed: [...record.placed],
    referenced: [...record.referenced],
  }
}

/** @internal Resolves all named views to absolute frames in paint order. */
export function resolveViewLayoutInternal(
  layout: AnyViewLayout,
  bounds: ViewLayoutBounds,
): readonly ResolvedViewFrame[] {
  const outer = validBounds(bounds)
  const record = layoutRecordOf(layout)
  const state: ResolutionState = {
    frames: new Map(),
    ordered: [],
  }
  record.resolve(outer, state)
  return state.ordered
}

interface GridPlacement {
  rows: readonly ViewTrack[]
  columns: readonly ViewTrack[]
  cells: readonly {
    view: string
    row: string
    column: string
  }[]
  rowGap: number
  columnGap: number
}

function resolveGrid(
  placement: GridPlacement,
  bounds: ViewLayoutBounds,
  state: ResolutionState,
): void {
  const rowGap = fittedGap(
    bounds.height,
    placement.rowGap,
    placement.rows.length,
  )
  const columnGap = fittedGap(
    bounds.width,
    placement.columnGap,
    placement.columns.length,
  )
  const rowSizes = resolveTracks(placement.rows, bounds.height, rowGap)
  const columnSizes = resolveTracks(placement.columns, bounds.width, columnGap)
  const rowOffsets = trackOffsets(rowSizes, rowGap, bounds.y)
  const columnOffsets = trackOffsets(columnSizes, columnGap, bounds.x)
  const rowIndexes = new Map(
    placement.rows.map((track, index) => [track.id, index]),
  )
  const columnIndexes = new Map(
    placement.columns.map((track, index) => [track.id, index]),
  )
  placement.cells.forEach((cell) => {
    const rowIndex = rowIndexes.get(cell.row)!
    const columnIndex = columnIndexes.get(cell.column)!
    placeFrame(
      cell.view,
      {
        x: columnOffsets[columnIndex]!,
        y: rowOffsets[rowIndex]!,
        width: columnSizes[columnIndex]!,
        height: rowSizes[rowIndex]!,
      },
      state,
    )
  })
}

function placeFrame(
  id: string,
  bounds: ViewLayoutBounds,
  state: ResolutionState,
): void {
  if (state.frames.has(id)) {
    throw new TypeError(`View layout places "${id}" more than once`)
  }
  const frame = {
    id,
    ...validBounds(bounds),
    order: state.ordered.length,
  }
  state.frames.set(id, frame)
  state.ordered.push(frame)
}

interface InsetPlacement {
  relativeTo: string
  anchor: ViewAnchor
  width: number
  height: number
  offset: number
}

function resolveInset(
  placement: InsetPlacement,
  target: ViewLayoutBounds,
): ViewLayoutBounds {
  const ratio = Math.min(
    1,
    target.width / (placement.width + placement.offset * 2),
    target.height / (placement.height + placement.offset * 2),
  )
  const width = placement.width * ratio
  const height = placement.height * ratio
  const offset = placement.offset * ratio
  const left = target.x + offset
  const centerX = target.x + (target.width - width) / 2
  const right = target.x + target.width - offset - width
  const top = target.y + offset
  const centerY = target.y + (target.height - height) / 2
  const bottom = target.y + target.height - offset - height

  switch (placement.anchor) {
    case 'top-left':
      return { x: left, y: top, width, height }
    case 'top':
      return { x: centerX, y: top, width, height }
    case 'top-right':
      return { x: right, y: top, width, height }
    case 'right':
      return { x: right, y: centerY, width, height }
    case 'bottom-right':
      return { x: right, y: bottom, width, height }
    case 'bottom':
      return { x: centerX, y: bottom, width, height }
    case 'bottom-left':
      return { x: left, y: bottom, width, height }
    case 'left':
      return { x: left, y: centerY, width, height }
    case 'center':
      return { x: centerX, y: centerY, width, height }
  }
}

function createLayout<TPlaced extends string, TReferenced extends string>(
  placed: readonly string[],
  referenced: readonly string[],
  resolve: ViewLayoutResolver,
): ViewLayout<TPlaced, TReferenced> {
  const record = Object.freeze({
    placed: Object.freeze([...placed]),
    referenced: Object.freeze([...referenced]),
    resolve,
  })
  return Object.freeze({
    [viewLayoutBrand]: undefined,
    [viewLayoutRecord]: record,
  }) as unknown as ViewLayout<TPlaced, TReferenced>
}

function layoutRecordOf(layout: AnyViewLayout): ViewLayoutRecord {
  const record = (layout as StoredViewLayout | undefined)?.[viewLayoutRecord]
  if (!record) {
    throw new TypeError(
      'View layouts must be created with fill, grid, layer, or inset',
    )
  }
  return record
}

function validateTracks(
  input: readonly ViewTrack[],
  axis: 'row' | 'column',
): {
  tracks: readonly ViewTrack[]
  indexes: ReadonlyMap<string, number>
} {
  if (!input.length) {
    throw new TypeError(`grid requires at least one ${axis} track`)
  }
  const indexes = new Map<string, number>()
  const tracks = input.map((authored, index): ViewTrack => {
    const id = validId(authored.id, `View grid ${axis} track ${index}`)
    if (indexes.has(id)) {
      throw new TypeError(`View grid contains duplicate ${axis} track "${id}"`)
    }
    indexes.set(id, index)
    if ('size' in authored && authored.size !== undefined) {
      if ('grow' in authored && authored.grow !== undefined) {
        throw new TypeError(
          `View grid ${axis} track "${id}" cannot set both size and grow`,
        )
      }
      return {
        id,
        size: positiveFinite(
          authored.size,
          `View grid ${axis} track "${id}" size`,
        ),
      }
    }
    if (!('grow' in authored) || authored.grow === undefined) {
      throw new TypeError(
        `View grid ${axis} track "${id}" requires size or grow`,
      )
    }
    const grow = positiveFinite(
      authored.grow,
      `View grid ${axis} track "${id}" grow`,
    )
    const min =
      authored.min === undefined
        ? undefined
        : positiveFinite(authored.min, `View grid ${axis} track "${id}" min`)
    const max =
      authored.max === undefined
        ? undefined
        : positiveFinite(authored.max, `View grid ${axis} track "${id}" max`)
    if (max !== undefined && max < (min ?? 1)) {
      throw new TypeError(
        `View grid ${axis} track "${id}" max must be at least min`,
      )
    }
    return {
      id,
      grow,
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    }
  })
  return { tracks, indexes }
}

function resolveTracks(
  tracks: readonly ViewTrack[],
  total: number,
  gap: number,
): number[] {
  const available = Math.max(
    Number.EPSILON,
    total - gap * Math.max(0, tracks.length - 1),
  )
  const sizes: number[] = tracks.map((track) =>
    track.size !== undefined ? track.size : (track.min ?? 1),
  )
  const preferred = sizes.reduce((sum, size) => sum + size, 0)
  if (preferred >= available) {
    const ratio = available / preferred
    return sizes.map((size) => size * ratio)
  }

  let remaining = available - preferred
  let active = tracks.flatMap((track, index) =>
    track.size !== undefined ? [] : [index],
  )
  while (remaining > Number.EPSILON && active.length) {
    const grow = active.reduce(
      (sum, index) =>
        sum + (tracks[index] as Extract<ViewTrack, { grow: number }>).grow,
      0,
    )
    let consumed = 0
    const next: number[] = []
    active.forEach((index) => {
      const track = tracks[index] as Extract<ViewTrack, { grow: number }>
      const addition = Math.min(
        (remaining * track.grow) / grow,
        (track.max ?? Infinity) - sizes[index]!,
      )
      sizes[index] = sizes[index]! + addition
      consumed += addition
      if (sizes[index]! < (track.max ?? Infinity)) next.push(index)
    })
    if (consumed <= Number.EPSILON) break
    remaining -= consumed
    active = next
  }
  return sizes
}

function fittedGap(total: number, requested: number, count: number): number {
  if (count <= 1) return 0
  return Math.min(
    requested,
    Math.max(0, (total - Number.EPSILON) / (count - 1)),
  )
}

function trackOffsets(
  sizes: readonly number[],
  gap: number,
  origin: number,
): number[] {
  let offset = origin
  return sizes.map((size) => {
    const current = offset
    offset += size + gap
    return current
  })
}

function validBounds(bounds: ViewLayoutBounds): ViewLayoutBounds {
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) {
    throw new TypeError('View layout bounds require finite x and y coordinates')
  }
  return {
    x: bounds.x,
    y: bounds.y,
    width: positiveFinite(bounds.width, 'View layout bounds width'),
    height: positiveFinite(bounds.height, 'View layout bounds height'),
  }
}

function validId(value: string, label: string): string {
  const id = value.trim()
  if (!id) throw new TypeError(`${label} requires a nonempty id`)
  return id
}

function validAnchor(value: ViewAnchor): ViewAnchor {
  const anchors: readonly ViewAnchor[] = [
    'top-left',
    'top',
    'top-right',
    'right',
    'bottom-right',
    'bottom',
    'bottom-left',
    'left',
    'center',
  ]
  if (!anchors.includes(value)) {
    throw new TypeError(`Unknown view inset anchor "${String(value)}"`)
  }
  return value
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be positive and finite`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be nonnegative and finite`)
  }
  return value
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
}
