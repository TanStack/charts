import { ticks } from 'd3-array'
import { contourDensity } from 'd3-contour'
import {
  channelValues,
  createMark,
  isChartKey,
  isFiniteNumber,
  visualValue,
} from './mark'
import {
  materializeLayoutXYRows,
  projectLayoutX,
  projectLayoutY,
} from './resolved-layout-position'
import { valueKey } from './scales'
import {
  identifyContourLevels,
  mapContourPolygons,
  normalizeContourThresholds,
} from './spatial-contour-internal'
import { groupRowsByChartKey } from './spatial-group-internal'
import type {
  LayoutXYSourceRow,
  ResolvedLayoutX,
  ResolvedLayoutY,
} from './resolved-layout-position'
import type { TransformLineage } from './transform'
import type {
  ContourLevelIdentity,
  IdentifiedContourLevel,
} from './spatial-contour-internal'
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
  ScenePolygon,
  VisualChannel,
} from './types'
import type { ContourDensity, ContourMultiPolygon } from 'd3-contour'

export interface DensityContourDatum<TDatum> extends TransformLineage<TDatum> {
  /** Weighted observations per CSS pixel squared at this contour level. */
  readonly density: number
  readonly group: ChartKey | null
}

export interface DensityContourOptions<TDatum>
  extends ChartMarkMotionOptions<never>, CartesianScaleBindings {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  /** Estimates a separate density field for each non-null group. */
  z?: Channel<TDatum, ChartKey | null | undefined>
  weight?: Channel<TDatum, number | null | undefined>
  /** Gaussian-kernel bandwidth in final CSS pixels. Defaults to 20. */
  bandwidth?: number
  /** Density-grid cell size in final CSS pixels. Defaults to 4. */
  cellSize?: number
  /** Exact density levels or an approximate shared level count. Defaults to 20. */
  thresholds?: number | Iterable<number>
  color?: Channel<DensityContourDatum<TDatum>, ChartKey | null | undefined>
  fill?: VisualChannel<DensityContourDatum<TDatum>, string>
  fillOpacity?: number
  stroke?: VisualChannel<DensityContourDatum<TDatum>, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

type DensityXOutput<TDatum, TOptions> = ChannelOutput<
  TDatum,
  TOptions extends { x: infer TChannel } ? TChannel : never,
  number
>

type DensityYOutput<TDatum, TOptions> = ChannelOutput<
  TDatum,
  TOptions extends { y: infer TChannel } ? TChannel : never,
  number
>

interface DensitySourceRow<TDatum> extends LayoutXYSourceRow<
  TDatum,
  ChartValue,
  ChartValue
> {
  readonly group: ChartKey | null
  readonly weight: number
}

type ProjectedDensityRow<TDatum> = DensitySourceRow<TDatum> &
  ResolvedLayoutX<ChartValue> &
  ResolvedLayoutY<ChartValue>

interface ResolvedDensityContour<TDatum> {
  readonly datum: DensityContourDatum<TDatum>
  readonly polygons: readonly ScenePolygon[]
  readonly levelIdentity: ContourLevelIdentity
}

type DensityContourAt<TDatum> = ((value: number) => ContourMultiPolygon) & {
  readonly max: number
}

type DensityWithContourAt<TDatum> = ContourDensity<TDatum> & {
  contours(data: readonly TDatum[]): DensityContourAt<TDatum>
}

/** Estimates filled density contours after x/y scales reach final screen space. */
export function densityContour<
  TDatum,
  const TOptions extends DensityContourOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  never,
  never,
  never,
  DensityXOutput<TDatum, TOptions>,
  DensityYOutput<TDatum, TOptions>,
  TOptions
>
export function densityContour<TDatum>(
  source: Iterable<TDatum>,
  options: DensityContourOptions<NoInfer<TDatum>>,
): CartesianChartMark<
  never,
  never,
  never,
  any,
  any,
  DensityContourOptions<TDatum>
> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const bandwidth = options.bandwidth ?? 20
  const cellSize = options.cellSize ?? 4
  const thresholds = normalizeContourThresholds(
    options.thresholds,
    20,
    'densityContour',
  )
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  if (!isFiniteNumber(bandwidth) || bandwidth < 0) {
    throw new TypeError(
      'densityContour: bandwidth must be a nonnegative finite number',
    )
  }
  if (!isFiniteNumber(cellSize) || cellSize < 1) {
    throw new TypeError(
      'densityContour: cellSize must be a finite number greater than or equal to 1',
    )
  }

  const xValues = channelValues(data, options.x, () => undefined)
  const yValues = channelValues(data, options.y, () => undefined)
  const zValues = channelValues(data, options.z, () => null)
  const weightValues = channelValues(data, options.weight, () => 1)
  const sourceRows: readonly DensitySourceRow<TDatum>[] =
    materializeLayoutXYRows(data, xValues, yValues).flatMap((row) => {
      const weight = weightValues[row.sourceIndex]
      if (!isFiniteNumber(weight) || weight === 0) return []
      const groupValue = zValues[row.sourceIndex]
      return [
        {
          ...row,
          group: isChartKey(groupValue) ? groupValue : null,
          weight,
        },
      ]
    })

  return createMark<never, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `density-contour-${markIndex}`
      return {
        id,
        channels: {
          x: { scale: xScale, values: sourceRows.map((row) => row.xValue) },
          y: { scale: yScale, values: sourceRows.map((row) => row.yValue) },
        },
        resolveLayout: ({ chart, scales }) => {
          const resolvedXScale = scales[xScale]
          const resolvedYScale = scales[yScale]
          if (!resolvedXScale || !resolvedYScale) {
            throw new TypeError('densityContour: x and y scales are required')
          }
          const rows = projectLayoutY(
            projectLayoutX(sourceRows, xValues, resolvedXScale),
            yValues,
            resolvedYScale,
          )
          const groups = groupRowsByChartKey(rows)
          const contourFunctions = groups.map(({ rows: groupRows }) => ({
            rows: groupRows,
            contour: createDensityEstimator<TDatum>(
              chart.width,
              chart.height,
              chart.x,
              chart.y,
              bandwidth,
              cellSize,
            ).contours(groupRows),
          }))
          const levels =
            typeof thresholds === 'number'
              ? sharedThresholds(
                  contourFunctions.map(({ contour }) => contour.max),
                  thresholds,
                )
              : thresholds
          const identifiedLevels = identifyContourLevels(
            levels,
            typeof thresholds === 'number'
              ? { kind: 'generated', count: thresholds }
              : { kind: 'explicit' },
          )
          const contours = contourFunctions.flatMap(
            ({ rows: groupRows, contour }) =>
              materializeContours(data, groupRows, contour, identifiedLevels),
          )
          const derivedData = contours.map(({ datum }) => datum)
          const colorValues = channelValues(
            derivedData,
            options.color,
            (datum) => datum.group,
          )

          return {
            channels: {
              x: { scale: xScale, values: sourceRows.map((row) => row.xValue) },
              y: { scale: yScale, values: sourceRows.map((row) => row.yValue) },
              color: {
                scale: 'color',
                values:
                  options.color === 'density'
                    ? [0, ...colorValues.filter(isChartKey)]
                    : colorValues.filter(isChartKey),
              },
            },
            render: ({ color: resolveColor }) => ({
              nodes: [
                {
                  kind: 'group',
                  key: id,
                  className: 'ts-chart__area ts-chart__density-contour',
                  ariaHidden: true,
                  translateX: chart.x,
                  translateY: chart.y,
                  clip: {
                    x: 0,
                    y: 0,
                    width: chart.width,
                    height: chart.height,
                  },
                  children: contours.map((contour, index) =>
                    contourNode(
                      id,
                      contour,
                      index,
                      derivedData,
                      colorValues,
                      resolveColor,
                      options,
                    ),
                  ),
                },
              ],
            }),
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function createDensityEstimator<TDatum>(
  width: number,
  height: number,
  originX: number,
  originY: number,
  bandwidth: number,
  cellSize: number,
): DensityWithContourAt<ProjectedDensityRow<TDatum>> {
  return contourDensity<ProjectedDensityRow<TDatum>>()
    .x((row) => row.x - originX)
    .y((row) => row.y - originY)
    .weight((row) => row.weight)
    .size([width, height])
    .bandwidth(bandwidth)
    .cellSize(cellSize) as DensityWithContourAt<ProjectedDensityRow<TDatum>>
}

function materializeContours<TDatum>(
  data: readonly TDatum[],
  rows: readonly ProjectedDensityRow<TDatum>[],
  contour: DensityContourAt<ProjectedDensityRow<TDatum>>,
  levels: readonly IdentifiedContourLevel[],
): readonly ResolvedDensityContour<TDatum>[] {
  const sourceIndexes = rows.map((row) => row.sourceIndex)
  const source = sourceIndexes.map((index) => data[index] as TDatum)
  const group = rows[0]?.group ?? null
  return levels.flatMap(({ value: density, identity }) => {
    const geometry = contour(density)
    const polygons = mapContourPolygons(geometry.coordinates)
    if (!polygons.length) return []
    return [
      {
        datum: { density, group, source, sourceIndexes },
        polygons,
        levelIdentity: identity,
      },
    ]
  })
}

function contourNode<TDatum>(
  id: string,
  contour: ResolvedDensityContour<TDatum>,
  index: number,
  data: readonly DensityContourDatum<TDatum>[],
  colorValues: readonly (ChartKey | null | undefined)[],
  resolveColor: (value: ChartKey | null) => string,
  options: DensityContourOptions<TDatum>,
): SceneNode {
  const colorValue = colorValues[index]
  const fallback = resolveColor(isChartKey(colorValue) ? colorValue : null)
  return {
    kind: 'area',
    key: JSON.stringify([
      id,
      valueKey(contour.datum.group),
      contour.levelIdentity,
    ]),
    points: [],
    polygons: contour.polygons,
    style: {
      fill: visualValue(options.fill, contour.datum, index, data, fallback),
      fillOpacity: options.fillOpacity,
      stroke:
        options.stroke === undefined
          ? undefined
          : visualValue(options.stroke, contour.datum, index, data, fallback),
      strokeOpacity: options.strokeOpacity,
      strokeWidth: options.strokeWidth,
      strokeDasharray: options.strokeDasharray,
      opacity: options.opacity,
    },
  }
}

function sharedThresholds(maxima: readonly number[], count: number) {
  const maximum = Math.max(0, ...maxima.filter(isFiniteNumber))
  return maximum > 0 ? ticks(Number.MIN_VALUE, maximum, count) : []
}
