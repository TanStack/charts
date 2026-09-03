import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
} from './mark'
import { adoptResolvedChildMark } from './resolved-layout-child'
import { projectLayoutX, projectLayoutY } from './resolved-layout-position'
import { compareChartKey, valueKey } from './scales'
import { groupRowsByChartKey } from './spatial-group-internal'
import {
  canonicalDelaunayPoints,
  delaunayNeighborPairs,
} from './spatial-delaunay-internal'
import { link } from './link'
import type { LinkOptions } from './link'
import type {
  LayoutXYSourceRow,
  ResolvedLayoutX,
  ResolvedLayoutY,
} from './resolved-layout-position'
import { materializeLayoutXYRows } from './resolved-layout-position'
import type {
  Channel,
  ChannelOutput,
  CartesianChartMark,
  ChartKey,
  ChartMark,
  ChartValue,
  MarkCallOptions,
  MarkScaleBindings,
} from './types'

export interface DelaunayLinkDatum<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly edgeKey: string
  readonly group: ChartKey | null
  readonly source: TDatum
  readonly sourceIndex: number
  readonly sourceKey: ChartKey
  readonly target: TDatum
  readonly targetIndex: number
  readonly targetKey: ChartKey
  readonly x1: TXValue
  readonly y1: TYValue
  readonly x2: TXValue
  readonly y2: TYValue
}

export type DelaunayLinkOptions<TDatum> = {
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  /** Triangulates each non-null group independently. */
  z?: Channel<TDatum, ChartKey | null | undefined>
  /** Stable point identity used to derive canonical edge keys. */
  key?: Channel<TDatum, ChartKey>
} & Omit<
  LinkOptions<DelaunayLinkDatum<TDatum>>,
  'x1' | 'y1' | 'x2' | 'y2' | 'z' | 'key'
>

type DelaunayLinkCallOptions<
  TDatum,
  TXChannel,
  TYChannel,
  TXScaleId extends string | undefined,
  TYScaleId extends string | undefined,
> = MarkCallOptions<
  DelaunayLinkOptions<NoInfer<TDatum>>,
  {
    x: TXChannel
    y: TYChannel
    xScale?: TXScaleId
    yScale?: TYScaleId
  }
>

type PreparedDelaunayRow<TDatum> = LayoutXYSourceRow<
  TDatum,
  ChartValue,
  ChartValue
> & {
  readonly group: ChartKey | null
  readonly key: ChartKey
}

type ProjectedDelaunayRow<TDatum> = PreparedDelaunayRow<TDatum> &
  ResolvedLayoutX<ChartValue> &
  ResolvedLayoutY<ChartValue>

/** Connects final-screen Delaunay neighbors while retaining semantic endpoints. */
export function delaunayLink<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    ChartValue | null | undefined
  >,
  const TXScaleId extends string | undefined = undefined,
  const TYScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options: DelaunayLinkCallOptions<
    TDatum,
    TXChannel,
    TYChannel,
    TXScaleId,
    TYScaleId
  >,
): CartesianChartMark<
  DelaunayLinkDatum<
    TDatum,
    ChannelOutput<TDatum, TXChannel, number>,
    ChannelOutput<TDatum, TYChannel, number>
  >,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  ChannelOutput<TDatum, TXChannel, number>,
  ChannelOutput<TDatum, TYChannel, number>,
  MarkScaleBindings<TXScaleId, TYScaleId>
>
export function delaunayLink<TDatum>(
  source: Iterable<TDatum>,
  options: DelaunayLinkOptions<NoInfer<TDatum>>,
): CartesianChartMark<
  DelaunayLinkDatum<TDatum>,
  any,
  any,
  any,
  any,
  DelaunayLinkOptions<TDatum>
> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xValues = channelValues(data, options.x, () => undefined)
  const yValues = channelValues(data, options.y, () => undefined)
  const zValues = channelValues(data, options.z, () => null)
  const completeRows = materializeLayoutXYRows(data, xValues, yValues)
  const {
    x: _x,
    y: _y,
    z: _z,
    key: _key,
    motion,
    renderer,
    ...presentation
  } = options
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark<DelaunayLinkDatum<TDatum>>(
    ({ markIndex }) => {
      const id = options.id ?? `delaunay-link-${markIndex}`
      const groups = data.map((_datum, index) => {
        const group = zValues[index]
        return isChartKey(group) ? group : null
      })
      const keys = inferredKeyValues(data, options.key, {
        groups,
        markId: id,
        warningIdentity: options,
      })
      const sourceRows: readonly PreparedDelaunayRow<TDatum>[] =
        completeRows.map((row) => ({
          ...row,
          group: groups[row.sourceIndex] ?? null,
          key: keys[row.sourceIndex] ?? row.sourceIndex,
        }))

      return {
        id,
        channels: {
          x: { scale: xScale, values: completeRows.map((row) => row.xValue) },
          y: { scale: yScale, values: completeRows.map((row) => row.yValue) },
        },
        resolveLayout: ({ scales }) => {
          const resolvedXScale = scales[xScale]
          const resolvedYScale = scales[yScale]
          if (!resolvedXScale || !resolvedYScale) {
            throw new TypeError('delaunayLink: x and y scales are required')
          }
          const rows = projectLayoutY(
            projectLayoutX(sourceRows, xValues, resolvedXScale),
            yValues,
            resolvedYScale,
          )
          const edges = groupRowsByChartKey(rows)
            .flatMap(({ rows: groupRows }) => createEdges(groupRows))
            .sort((left, right) => compareText(left.edgeKey, right.edgeKey))
          const child = link(edges, {
            ...presentation,
            id,
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
            z: 'group',
            key: 'edgeKey',
          })

          return adoptResolvedChildMark(child.initialize({ markIndex }))
        },
      }
    },
    motion,
    renderer,
  )
}

function createEdges<TDatum>(
  rows: readonly ProjectedDelaunayRow<TDatum>[],
): DelaunayLinkDatum<TDatum>[] {
  const orderedRows = canonicalDelaunayPoints(rows)
  return delaunayNeighborPairs(orderedRows).map(([leftIndex, rightIndex]) => {
    const left = orderedRows[leftIndex]!
    const right = orderedRows[rightIndex]!
    const [source, target] = canonicalEndpoints(left, right)
    return {
      edgeKey: JSON.stringify([
        valueKey(source.group),
        valueKey(source.key),
        valueKey(target.key),
      ]),
      group: source.group,
      source: source.datum,
      sourceIndex: source.sourceIndex,
      sourceKey: source.key,
      target: target.datum,
      targetIndex: target.sourceIndex,
      targetKey: target.key,
      x1: source.xValue,
      y1: source.yValue,
      x2: target.xValue,
      y2: target.yValue,
    }
  })
}

function canonicalEndpoints<TDatum>(
  left: ProjectedDelaunayRow<TDatum>,
  right: ProjectedDelaunayRow<TDatum>,
): readonly [ProjectedDelaunayRow<TDatum>, ProjectedDelaunayRow<TDatum>] {
  const leftKey = valueKey(left.key)
  const rightKey = valueKey(right.key)
  return compareChartKey(left.key, right.key) < 0 ||
    (leftKey === rightKey && left.sourceIndex <= right.sourceIndex)
    ? [left, right]
    : [right, left]
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
