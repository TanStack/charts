import { stratify } from 'd3-hierarchy'
import { toArray, transformValues } from './transform-internal'
import type { TransformValue } from './transform'
import type { HierarchyNode } from 'd3-hierarchy'

interface SourceRow<TDatum> {
  readonly datum: TDatum
  readonly index: number
}

export interface FlatHierarchyDatum<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly datum: TDatum | null
  readonly sourceIndex: number | null
}

export type FlatHierarchyNode<TDatum> = HierarchyNode<
  FlatHierarchyDatum<TDatum>
> & { readonly id: string }

export interface FlatHierarchy<TDatum> {
  readonly data: readonly TDatum[]
  readonly root: FlatHierarchyNode<TDatum>
}

export interface FlatHierarchyNodeContext<TDatum> {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly data: TDatum | null
  readonly depth: number
  readonly height: number
  readonly internal: boolean
  readonly external: boolean
  readonly source: readonly TDatum[]
  readonly sourceIndexes: readonly number[]
}

export interface FlatHierarchyPathOptions<TDatum> {
  readonly path: TransformValue<TDatum, string>
  readonly delimiter?: string
  readonly id?: never
  readonly parentId?: never
}

export interface FlatHierarchyParentOptions<TDatum> {
  readonly id: TransformValue<TDatum, string>
  readonly parentId: TransformValue<TDatum, string | null | undefined>
  readonly path?: never
  readonly delimiter?: never
}

export type FlatHierarchyOptions<TDatum> =
  FlatHierarchyPathOptions<TDatum> | FlatHierarchyParentOptions<TDatum>

/** Builds a private D3 hierarchy while retaining honest raw-row lineage. */
export function buildFlatHierarchy<TDatum>(
  source: Iterable<TDatum>,
  options: FlatHierarchyOptions<TDatum>,
  owner: string,
): FlatHierarchy<TDatum> {
  const data = toArray(source)
  const sourceRows = data.map((datum, index) => ({ datum, index }))
  const pathMode = options.path !== undefined
  let root: HierarchyNode<SourceRow<TDatum> | null>

  try {
    if (pathMode) {
      const normalize = pathNormalizer(options.delimiter, owner)
      const paths = transformValues(data, options.path).map((path, index) => {
        if (typeof path !== 'string' || path.length === 0) {
          throw new TypeError(
            `${owner}: path at index ${index} must be a nonempty string`,
          )
        }
        return normalize(path)
      })
      assertUnique(paths, 'path', owner)
      root = stratify<SourceRow<TDatum>>().path(
        (row) => paths[row.index] as string,
      )(sourceRows) as HierarchyNode<SourceRow<TDatum> | null>
    } else {
      const parentOptions = options as FlatHierarchyParentOptions<TDatum>
      const ids = transformValues(data, parentOptions.id)
      const parentIds = transformValues(data, parentOptions.parentId)
      ids.forEach((id, index) => assertId(id, `id at index ${index}`, owner))
      assertUnique(ids as string[], 'id', owner)
      parentIds.forEach((id, index) => {
        if (id != null) assertId(id, `parentId at index ${index}`, owner)
      })
      root = stratify<SourceRow<TDatum>>()
        .id((row) => ids[row.index] as string)
        .parentId((row) => parentIds[row.index] ?? undefined)(
        sourceRows,
      ) as HierarchyNode<SourceRow<TDatum> | null>
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith(`${owner}:`)) {
      throw error
    }
    throw new TypeError(
      `${owner}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const hierarchyIds = new Set<string>()
  for (const node of root.descendants()) {
    const id = node.id
    if (id === undefined) {
      throw new TypeError(`${owner}: hierarchy node is missing an id`)
    }
    if (hierarchyIds.has(id)) {
      throw new TypeError(`${owner}: duplicate hierarchy id "${id}"`)
    }
    hierarchyIds.add(id)
    const sourceRow = node.data
    ;(node as unknown as { data: FlatHierarchyDatum<TDatum> }).data = {
      id,
      parentId: node.parent?.id ?? null,
      name: pathMode ? pathName(id) : id,
      datum: sourceRow === null ? null : sourceRow.datum,
      sourceIndex: sourceRow?.index ?? null,
    }
  }

  return {
    data,
    root: root as unknown as FlatHierarchyNode<TDatum>,
  }
}

/** Materializes the hierarchy metadata shared by public hierarchy layouts. */
export function flatHierarchyNodeContext<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): FlatHierarchyNodeContext<TDatum> {
  const { datum, id, name, parentId, sourceIndex } = node.data
  const source = Object.freeze(
    sourceIndex === null ? [] : [datum as TDatum],
  ) as readonly TDatum[]
  const sourceIndexes = Object.freeze(
    sourceIndex === null ? [] : [sourceIndex],
  ) as readonly number[]
  return {
    id,
    parentId,
    name,
    data: datum,
    depth: node.depth,
    height: node.height,
    internal: node.children !== undefined,
    external: node.children === undefined,
    source,
    sourceIndexes,
  }
}

/** Aggregates nonnegative source values without expanding node lineage. */
export function aggregateFlatHierarchyValues<TDatum>(
  hierarchy: FlatHierarchy<TDatum>,
  value: TransformValue<TDatum, number | null | undefined>,
  owner: string,
): void {
  const values = transformValues(hierarchy.data, value).map(
    (resolved, index) => {
      if (resolved == null) return 0
      assertNonnegativeFinite(resolved, `value at index ${index}`, owner)
      return resolved
    },
  )
  hierarchy.root.sum(({ sourceIndex }) =>
    sourceIndex === null ? 0 : (values[sourceIndex] as number),
  )
  for (const node of hierarchy.root.descendants()) {
    assertNonnegativeFinite(
      node.value,
      `aggregate value for node "${node.data.id}"`,
      owner,
    )
  }
}

/** Returns root-to-parent ids for a hierarchy node. */
export function flatHierarchyAncestorIds<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): readonly string[] {
  const ids: string[] = []
  let parent = node.parent as FlatHierarchyNode<TDatum> | null
  while (parent) {
    ids.push(parent.data.id)
    parent = parent.parent as FlatHierarchyNode<TDatum> | null
  }
  ids.reverse()
  return Object.freeze(ids)
}

/** Returns the depth-one branch containing a node, or null for the root. */
export function flatHierarchyBranchId<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): string | null {
  if (node.depth === 0) return null
  let branch = node
  while (branch.depth > 1) {
    branch = branch.parent as FlatHierarchyNode<TDatum>
  }
  return branch.data.id
}

export function flatHierarchyNodeValue<TDatum>(
  node: FlatHierarchyNode<TDatum>,
): number {
  return Number.isFinite(node.value) ? (node.value as number) : 0
}

function assertUnique(
  values: readonly string[],
  description: string,
  owner: string,
) {
  const indexes = new Map<string, number>()
  values.forEach((value, index) => {
    const previous = indexes.get(value)
    if (previous !== undefined) {
      throw new TypeError(
        `${owner}: duplicate ${description} "${value}" at indexes ${previous} and ${index}`,
      )
    }
    indexes.set(value, index)
  })
}

function assertId(
  value: unknown,
  description: string,
  owner: string,
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${owner}: ${description} must be a nonempty string`)
  }
}

function assertNonnegativeFinite(
  value: unknown,
  description: string,
  owner: string,
) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `${owner}: ${description} must be nonnegative and finite`,
    )
  }
}

function pathNormalizer(delimiter = '/', owner: string) {
  if (typeof delimiter !== 'string' || delimiter.length !== 1) {
    throw new TypeError(`${owner}: delimiter must be exactly one character`)
  }
  if (delimiter === '\\') {
    throw new TypeError(`${owner}: delimiter cannot be backslash`)
  }
  if (delimiter === '/') return (path: string) => path
  const delimiterCode = delimiter.charCodeAt(0)
  return (path: string) => slashDelimiter(path, delimiterCode)
}

const backslashCode = 92
const slashCode = 47

// Converts a custom one-character delimiter to D3's escaped slash syntax.
function slashDelimiter(input: string, delimiterCode: number): string {
  let afterBackslash = false
  for (let index = 0, length = input.length; index < length; index += 1) {
    switch (input.charCodeAt(index)) {
      case backslashCode:
        if (!afterBackslash) {
          afterBackslash = true
          continue
        }
        break
      case delimiterCode:
        if (afterBackslash) {
          input = input.slice(0, index - 1) + input.slice(index)
          index -= 1
          length -= 1
        } else {
          input = `${input.slice(0, index)}/${input.slice(index + 1)}`
        }
        break
      case slashCode:
        if (afterBackslash) {
          input = `${input.slice(0, index)}\\\\${input.slice(index)}`
          index += 2
          length += 2
        } else {
          input = `${input.slice(0, index)}\\${input.slice(index)}`
          index += 1
          length += 1
        }
        break
    }
    afterBackslash = false
  }
  return input
}

function pathName(path: string): string {
  let index = path.length
  while (--index > 0) {
    if (isPathSlash(path, index)) break
  }
  return unescapePath(path.slice(index + 1))
}

function isPathSlash(path: string, index: number): boolean {
  if (path[index] !== '/') return false
  let escapes = 0
  while (index > 0 && path[--index] === '\\') escapes += 1
  return escapes % 2 === 0
}

function unescapePath(input: string): string {
  let afterBackslash = false
  for (let index = 0, length = input.length; index < length; index += 1) {
    const code = input.charCodeAt(index)
    if (code === backslashCode && !afterBackslash) {
      afterBackslash = true
      continue
    }
    if ((code === backslashCode || code === slashCode) && afterBackslash) {
      input = input.slice(0, index - 1) + input.slice(index)
      index -= 1
      length -= 1
    }
    afterBackslash = false
  }
  return input
}
