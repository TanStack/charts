import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import {
  isResolvedCategoryScale,
  resolvedCategoryStep,
} from './mapped-spacing-internal'
import { valueKey } from './scales'
import { groupedIndexes } from './transform-internal'
import type {
  Channel,
  ChannelOutput,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartCurve,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartMarkStateStyle,
  ChartPoint,
  SceneArea,
  ScenePolyline,
  VisualChannel,
} from './types'

export type RidgelinePosition = number | Date
export type RidgelineCurve = Pick<ChartCurve, 'line'>
export type RidgelineStateStyle<TDatum = unknown> = Pick<
  ChartMarkStateStyle<TDatum>,
  'fillOpacity' | 'strokeOpacity' | 'opacity'
>

interface RidgelineOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  /** Normalized profile height in the inclusive range [0, 1]. */
  height: Channel<TDatum, number | null | undefined>
  /** Peak height in category-step units. Defaults to 1. */
  overlap?: number
  key?: Channel<TDatum, ChartKey>
  color?: Channel<TDatum, ChartKey | null | undefined>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  /** Set to null to omit the profile outline. */
  stroke?: VisualChannel<TDatum, string> | null
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  curve?: RidgelineCurve
  states?: readonly ChartMarkState<TDatum, RidgelineStateStyle<TDatum>>[]
}

export interface RidgelineYOptions<
  TDatum,
  TPosition extends RidgelinePosition = RidgelinePosition,
  TCategory extends ChartKey = ChartKey,
> extends RidgelineOptions<TDatum> {
  x: Channel<TDatum, TPosition | null | undefined>
  y: Channel<TDatum, TCategory | null | undefined>
}

export interface RidgelineXOptions<
  TDatum,
  TPosition extends RidgelinePosition = RidgelinePosition,
  TCategory extends ChartKey = ChartKey,
> extends RidgelineOptions<TDatum> {
  x: Channel<TDatum, TCategory | null | undefined>
  y: Channel<TDatum, TPosition | null | undefined>
}

type PositionOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  RidgelinePosition
>

type CategoryOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  ChartKey
>

type RidgelineYCallOptions<
  TDatum,
  TXChannel extends Channel<
    NoInfer<TDatum>,
    RidgelinePosition | null | undefined
  >,
  TYChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
> = Omit<
  RidgelineYOptions<
    NoInfer<TDatum>,
    PositionOutput<TDatum, TXChannel>,
    CategoryOutput<TDatum, TYChannel>
  >,
  'x' | 'y'
> & {
  x: TXChannel
  y: TYChannel
}

type RidgelineXCallOptions<
  TDatum,
  TXChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
  TYChannel extends Channel<
    NoInfer<TDatum>,
    RidgelinePosition | null | undefined
  >,
> = Omit<
  RidgelineXOptions<
    NoInfer<TDatum>,
    PositionOutput<TDatum, TYChannel>,
    CategoryOutput<TDatum, TXChannel>
  >,
  'x' | 'y'
> & {
  x: TXChannel
  y: TYChannel
}

/** Draws horizontal profiles rising from categorical y baselines. */
export function ridgelineY<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    RidgelinePosition | null | undefined
  >,
  const TYChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
  const TXScaleId extends string = 'x',
  const TYScaleId extends string = 'y',
>(
  source: Iterable<TDatum>,
  options: RidgelineYCallOptions<TDatum, TXChannel, TYChannel> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
): ChartMark<
  TDatum,
  PositionOutput<TDatum, TXChannel>,
  CategoryOutput<TDatum, TYChannel>,
  PositionOutput<TDatum, TXChannel>,
  CategoryOutput<TDatum, TYChannel>,
  TXScaleId,
  TYScaleId
>
export function ridgelineY<TDatum>(
  source: Iterable<TDatum>,
  options: RidgelineYOptions<NoInfer<TDatum>>,
): CartesianChartMark<any, any, any, any, any, RidgelineYOptions<TDatum>> {
  return ridgeline(source, options, options.x, options.y, 'y')
}

/** Draws vertical profiles extending from categorical x baselines. */
export function ridgelineX<
  TDatum,
  const TXChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    RidgelinePosition | null | undefined
  >,
  const TXScaleId extends string = 'x',
  const TYScaleId extends string = 'y',
>(
  source: Iterable<TDatum>,
  options: RidgelineXCallOptions<TDatum, TXChannel, TYChannel> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
): ChartMark<
  TDatum,
  CategoryOutput<TDatum, TXChannel>,
  PositionOutput<TDatum, TYChannel>,
  CategoryOutput<TDatum, TXChannel>,
  PositionOutput<TDatum, TYChannel>,
  TXScaleId,
  TYScaleId
>
export function ridgelineX<TDatum>(
  source: Iterable<TDatum>,
  options: RidgelineXOptions<NoInfer<TDatum>>,
): CartesianChartMark<any, any, any, any, any, RidgelineXOptions<TDatum>> {
  return ridgeline(source, options, options.y, options.x, 'x')
}

function ridgeline<TDatum>(
  source: Iterable<TDatum>,
  options: RidgelineOptions<TDatum>,
  position: Channel<TDatum, RidgelinePosition | null | undefined>,
  category: Channel<TDatum, ChartKey | null | undefined>,
  orientation: 'x' | 'y',
): CartesianChartMark<any, any, any, any, any, RidgelineOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'
  const overlap = options.overlap ?? 1
  if (!isFiniteNumber(overlap) || overlap <= 0) {
    throw new TypeError('ridgeline: overlap must be a positive finite number')
  }

  return createMark<any, any, any, string, string>(
    ({ markIndex }) => {
      const id = options.id ?? `ridgeline-${orientation}-${markIndex}`
      const positionValues = channelValues(data, position, () => undefined)
      const categoryValues = channelValues(data, category, () => undefined)
      const heights = channelValues(data, options.height, () => undefined)
      heights.forEach((height, index) => {
        if (!isFiniteNumber(height)) return
        if (height < 0 || height > 1) {
          throw new TypeError(
            `ridgeline: height must be between 0 and 1; received ${height} at index ${index}`,
          )
        }
      })
      const categoryKeys = categoryValues.map((value) =>
        isChartKey(value) ? value : null,
      )
      const colorValues =
        options.color === undefined
          ? categoryKeys
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: categoryKeys,
        candidates: [positionValues],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        states: markStates(data, options.states),
        channels:
          orientation === 'y'
            ? {
                x: {
                  scale: xScale,
                  values: positionValues.filter(isRidgelinePosition),
                },
                y: {
                  scale: yScale,
                  values: categoryValues.filter(isChartKey),
                },
                color: {
                  scale: 'color',
                  values: colorValues.filter(isChartKey),
                },
              }
            : {
                x: {
                  scale: xScale,
                  values: categoryValues.filter(isChartKey),
                },
                y: {
                  scale: yScale,
                  values: positionValues.filter(isRidgelinePosition),
                },
                color: {
                  scale: 'color',
                  values: colorValues.filter(isChartKey),
                },
              },
        render: ({ chart, scales, color: resolveColor }) => {
          const categoryScale =
            orientation === 'y' ? scales[yScale]! : scales[xScale]!
          if (!isResolvedCategoryScale(categoryScale)) {
            throw new TypeError(
              `ridgeline${orientation.toUpperCase()}: the category axis requires a band or point scale`,
            )
          }
          const positionScale =
            orientation === 'y' ? scales[xScale] : scales[yScale]
          if (!positionScale) {
            throw new TypeError(
              `ridgeline${orientation.toUpperCase()}: the profile axis scale is required`,
            )
          }
          const span = orientation === 'y' ? chart.height : chart.width
          const step = resolvedCategoryStep(categoryScale, span, overlap * 2)
          const areas: SceneArea[] = []
          const lines: ScenePolyline[] = []
          const points: ChartPoint<TDatum>[] = []

          for (const { key: group, indexes } of groupedIndexes(categoryKeys)) {
            const firstIndex = indexes.find((index) =>
              isChartKey(categoryValues[index]),
            )
            if (firstIndex === undefined) continue
            const categoryValue = categoryValues[firstIndex]!
            const baseline = categoryScale.map(categoryValue)
            if (!Number.isFinite(baseline)) continue
            const datum = data[firstIndex]!
            const fallback = resolveColor(colorValues[firstIndex] ?? null)
            const fill = visualValue(
              options.fill,
              datum,
              firstIndex,
              data,
              fallback,
            )
            const stroke =
              options.stroke === null
                ? undefined
                : visualValue(options.stroke, datum, firstIndex, data, fallback)
            let profile: (readonly [number, number])[] = []
            let baselinePoints: (readonly [number, number])[] = []
            let segmentPoints: ChartPoint<TDatum>[] = []
            let segmentIndex = 0

            const flush = () => {
              if (!profile.length) return
              const groupKey = valueKey(group)
              const interaction = {
                points: segmentPoints,
                affinity: orientation === 'y' ? ('x' as const) : ('y' as const),
              }
              const profilePath = options.curve?.line(profile)
              areas.push({
                kind: 'area',
                key: `${id}:${groupKey}:segment:${segmentIndex}:area`,
                points: [...profile, ...[...baselinePoints].reverse()],
                ...(profilePath
                  ? { path: closeProfilePath(profilePath, baselinePoints) }
                  : {}),
                interaction,
                style: {
                  fill,
                  fillOpacity: options.fillOpacity ?? 0.5,
                },
              })
              if (stroke !== undefined) {
                lines.push({
                  kind: 'polyline',
                  key: `${id}:${groupKey}:segment:${segmentIndex}:line`,
                  points: profile,
                  ...(profilePath ? { path: profilePath } : {}),
                  interaction,
                  style: {
                    fill: 'none',
                    stroke,
                    strokeOpacity: options.strokeOpacity,
                    strokeWidth: options.strokeWidth ?? 1.5,
                    strokeDasharray: options.strokeDasharray,
                  },
                })
              }
              points.push(...segmentPoints)
              profile = []
              baselinePoints = []
              segmentPoints = []
              segmentIndex += 1
            }

            for (const index of indexes) {
              const positionValue = positionValues[index]
              const nextCategory = categoryValues[index]
              const height = heights[index]
              if (
                !isRidgelinePosition(positionValue) ||
                !isChartKey(nextCategory) ||
                !isFiniteNumber(height)
              ) {
                flush()
                continue
              }
              const positionPixel = positionScale.map(positionValue)
              const nextBaseline = categoryScale.map(nextCategory)
              if (
                !Number.isFinite(positionPixel) ||
                !Number.isFinite(nextBaseline)
              ) {
                flush()
                continue
              }
              const profilePixel =
                nextBaseline +
                (orientation === 'y' ? -1 : 1) * height * overlap * step
              const x = orientation === 'y' ? positionPixel : profilePixel
              const y = orientation === 'y' ? profilePixel : positionPixel
              const key = `${id}:${valueKey(group)}:${valueKey(keys[index])}`
              const point: ChartPoint<TDatum> = {
                key,
                markId: id,
                group,
                groupLabel: String(nextCategory),
                datum: data[index]!,
                datumIndex: index,
                xValue: orientation === 'y' ? positionValue : nextCategory,
                yValue: orientation === 'y' ? nextCategory : positionValue,
                x,
                y,
                color: fill,
              }
              profile.push([x, y])
              baselinePoints.push(
                orientation === 'y'
                  ? [positionPixel, nextBaseline]
                  : [nextBaseline, positionPixel],
              )
              segmentPoints.push(point)
            }
            flush()
          }

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: `ts-chart__ridgeline ts-chart__ridgeline-${orientation}`,
                ariaHidden: true,
                children: [
                  {
                    kind: 'group',
                    key: `${id}:areas`,
                    className: 'ts-chart__area',
                    ariaHidden: true,
                    children: areas,
                  },
                  {
                    kind: 'group',
                    key: `${id}:lines`,
                    className: 'ts-chart__line',
                    ariaHidden: true,
                    children: lines,
                  },
                ],
              },
            ],
            points,
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function isRidgelinePosition(value: unknown): value is RidgelinePosition {
  return (
    isFiniteNumber(value) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function closeProfilePath(
  profilePath: string,
  baseline: readonly (readonly [number, number])[],
): string {
  const first = baseline[0]
  const last = baseline.at(-1)
  if (!first || !last) return profilePath
  return `${profilePath}L${last[0]},${last[1]}L${first[0]},${first[1]}Z`
}
