import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  visualValue,
} from './mark'
import {
  materializeLayoutXYRows,
  projectLayoutX,
  projectLayoutY,
} from './resolved-layout-position'
import { valueKey } from './scales'
import { canonicalDelaunayPoints } from './spatial-delaunay-internal'
import { groupRowsByChartKey } from './spatial-group-internal'
import { voronoiCellPolygons } from './spatial-voronoi-internal'
import type {
  LayoutXYSourceRow,
  ResolvedLayoutX,
  ResolvedLayoutY,
} from './resolved-layout-position'
import type {
  Channel,
  ChannelOutput,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartValue,
  SceneNode,
  VisualChannel,
} from './types'

export interface VoronoiOptions<TDatum>
  extends ChartMarkMotionOptions<never>, CartesianScaleBindings {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  /** Builds a separate full-extent tessellation for each non-null group. */
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  color?: Channel<TDatum, ChartKey | null | undefined>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

type VoronoiXOutput<TDatum, TOptions> = ChannelOutput<
  TDatum,
  TOptions extends { x: infer TChannel } ? TChannel : never,
  number
>

type VoronoiYOutput<TDatum, TOptions> = ChannelOutput<
  TDatum,
  TOptions extends { y: infer TChannel } ? TChannel : never,
  number
>

type PreparedVoronoiRow<TDatum> = LayoutXYSourceRow<
  TDatum,
  ChartValue,
  ChartValue
> & {
  readonly group: ChartKey | null
  readonly key: ChartKey
}

type ProjectedVoronoiRow<TDatum> = PreparedVoronoiRow<TDatum> &
  ResolvedLayoutX<ChartValue> &
  ResolvedLayoutY<ChartValue>

/** Draws final-screen Voronoi cells without adding focus candidates. */
export function voronoi<
  TDatum,
  const TOptions extends VoronoiOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  never,
  never,
  never,
  VoronoiXOutput<TDatum, TOptions>,
  VoronoiYOutput<TDatum, TOptions>,
  TOptions
>
export function voronoi<TDatum>(
  source: Iterable<TDatum>,
  options: VoronoiOptions<NoInfer<TDatum>>,
): CartesianChartMark<never, never, never, any, any, VoronoiOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xValues = channelValues(data, options.x, () => undefined)
  const yValues = channelValues(data, options.y, () => undefined)
  const zValues = channelValues(data, options.z, () => null)
  const colorValues = channelValues(data, options.color, () => null)
  const completeRows = materializeLayoutXYRows(data, xValues, yValues)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMark<never, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `voronoi-${markIndex}`
      const groups = data.map((_datum, index) => {
        const group = zValues[index]
        return isChartKey(group) ? group : null
      })
      const keys = inferredKeyValues(data, options.key, {
        groups,
        markId: id,
        warningIdentity: options,
      })
      const sourceRows: readonly PreparedVoronoiRow<TDatum>[] =
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
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        render: ({ chart, scales, color: resolveColor }) => {
          const resolvedXScale = scales[xScale]
          const resolvedYScale = scales[yScale]
          if (!resolvedXScale || !resolvedYScale) {
            throw new TypeError('voronoi: x and y scales are required')
          }
          const rows = projectLayoutY(
            projectLayoutX(sourceRows, xValues, resolvedXScale),
            yValues,
            resolvedYScale,
          )
          const nodes = groupRowsByChartKey(rows).flatMap(
            ({ rows: groupRows }) =>
              createCellNodes(
                id,
                data,
                canonicalDelaunayPoints(groupRows),
                chart,
                colorValues,
                resolveColor,
                options,
              ),
          )

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__voronoi',
                ariaHidden: true,
                children: nodes,
              },
            ],
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function createCellNodes<TDatum>(
  id: string,
  data: readonly TDatum[],
  rows: readonly ProjectedVoronoiRow<TDatum>[],
  chart: { x: number; y: number; width: number; height: number },
  colorValues: readonly (ChartKey | null | undefined)[],
  resolveColor: (value: ChartKey | null) => string,
  options: VoronoiOptions<TDatum>,
): SceneNode[] {
  return voronoiCellPolygons(rows, chart).map(({ pointIndex, points }) => {
    const row = rows[pointIndex]!
    const datum = row.datum
    const datumIndex = row.sourceIndex
    const colorValue = colorValues[datumIndex]
    const fallback = resolveColor(isChartKey(colorValue) ? colorValue : null)
    return {
      kind: 'area',
      key: JSON.stringify([id, valueKey(row.group), valueKey(row.key)]),
      points,
      style: {
        fill: visualValue(options.fill, datum, datumIndex, data, fallback),
        fillOpacity: options.fillOpacity,
        stroke:
          options.stroke === undefined
            ? undefined
            : visualValue(options.stroke, datum, datumIndex, data, fallback),
        strokeOpacity: options.strokeOpacity,
        strokeWidth: options.strokeWidth,
        strokeDasharray: options.strokeDasharray,
        opacity: options.opacity,
      },
    }
  })
}
