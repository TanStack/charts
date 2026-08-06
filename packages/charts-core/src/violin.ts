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
import type { AreaXCurve } from './area-x'
import type {
  Channel,
  ChannelOutput,
  ChartAreaStateStyle,
  ChartCurve,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartPoint,
  SceneArea,
  VisualChannel,
} from './types'

export type ViolinPosition = number | Date
export type ViolinYCurve = AreaXCurve
export type ViolinXCurve = Pick<ChartCurve, 'area'>

interface ViolinOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  /** Normalized half-envelope width in the inclusive range [0, 1]. */
  width: Channel<TDatum, number | null | undefined>
  /** Full peak width in category-step units. Defaults to 0.8. */
  span?: number
  key?: Channel<TDatum, ChartKey>
  color?: Channel<TDatum, ChartKey | null | undefined>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  /** Set to null to omit the envelope outline. */
  stroke?: VisualChannel<TDatum, string> | null
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  states?: readonly ChartMarkState<TDatum, ChartAreaStateStyle<TDatum>>[]
}

export interface ViolinYOptions<
  TDatum,
  TPosition extends ViolinPosition = ViolinPosition,
  TCategory extends ChartKey = ChartKey,
> extends ViolinOptions<TDatum> {
  x: Channel<TDatum, TCategory | null | undefined>
  y: Channel<TDatum, TPosition | null | undefined>
  curve?: ViolinYCurve
}

export interface ViolinXOptions<
  TDatum,
  TPosition extends ViolinPosition = ViolinPosition,
  TCategory extends ChartKey = ChartKey,
> extends ViolinOptions<TDatum> {
  x: Channel<TDatum, TPosition | null | undefined>
  y: Channel<TDatum, TCategory | null | undefined>
  curve?: ViolinXCurve
}

type PositionOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  ViolinPosition
>

type CategoryOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  ChartKey
>

type ViolinYCallOptions<
  TDatum,
  TXChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
  TYChannel extends Channel<NoInfer<TDatum>, ViolinPosition | null | undefined>,
> = Omit<
  ViolinYOptions<
    NoInfer<TDatum>,
    PositionOutput<TDatum, TYChannel>,
    CategoryOutput<TDatum, TXChannel>
  >,
  'x' | 'y'
> & {
  x: TXChannel
  y: TYChannel
}

type ViolinXCallOptions<
  TDatum,
  TXChannel extends Channel<NoInfer<TDatum>, ViolinPosition | null | undefined>,
  TYChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
> = Omit<
  ViolinXOptions<
    NoInfer<TDatum>,
    PositionOutput<TDatum, TXChannel>,
    CategoryOutput<TDatum, TYChannel>
  >,
  'x' | 'y'
> & {
  x: TXChannel
  y: TYChannel
}

/** Draws vertical mirrored profiles around categorical x baselines. */
export function violinY<
  TDatum,
  const TXChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    ViolinPosition | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: ViolinYCallOptions<TDatum, TXChannel, TYChannel>,
): ChartMark<
  TDatum,
  CategoryOutput<TDatum, TXChannel>,
  PositionOutput<TDatum, TYChannel>
>
export function violinY<TDatum>(
  source: Iterable<TDatum>,
  options: ViolinYOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return violin(source, options, options.y, options.x, options.curve, 'y')
}

/** Draws horizontal mirrored profiles around categorical y baselines. */
export function violinX<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    ViolinPosition | null | undefined
  >,
  const TYChannel extends Channel<NoInfer<TDatum>, ChartKey | null | undefined>,
>(
  source: Iterable<TDatum>,
  options: ViolinXCallOptions<TDatum, TXChannel, TYChannel>,
): ChartMark<
  TDatum,
  PositionOutput<TDatum, TXChannel>,
  CategoryOutput<TDatum, TYChannel>
>
export function violinX<TDatum>(
  source: Iterable<TDatum>,
  options: ViolinXOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return violin(source, options, options.x, options.y, options.curve, 'x')
}

function violin<TDatum>(
  source: Iterable<TDatum>,
  options: ViolinOptions<TDatum>,
  position: Channel<TDatum, ViolinPosition | null | undefined>,
  category: Channel<TDatum, ChartKey | null | undefined>,
  curve: ViolinXCurve | ViolinYCurve | undefined,
  orientation: 'x' | 'y',
): ChartMark<any, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const span = options.span ?? 0.8
  if (!isFiniteNumber(span) || span <= 0) {
    throw new TypeError('violin: span must be a positive finite number')
  }

  return createMark(({ markIndex }) => {
    const id = options.id ?? `violin-${orientation}-${markIndex}`
    const positionValues = channelValues(data, position, () => undefined)
    const categoryValues = channelValues(data, category, () => undefined)
    const widths = channelValues(data, options.width, () => undefined)
    widths.forEach((width, index) => {
      if (!isFiniteNumber(width)) return
      if (width < 0 || width > 1) {
        throw new TypeError(
          `violin: width must be between 0 and 1; received ${width} at index ${index}`,
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
                scale: 'x',
                values: categoryValues.filter(isChartKey),
              },
              y: {
                scale: 'y',
                values: positionValues.filter(isViolinPosition),
              },
              color: {
                scale: 'color',
                values: colorValues.filter(isChartKey),
              },
            }
          : {
              x: {
                scale: 'x',
                values: positionValues.filter(isViolinPosition),
              },
              y: {
                scale: 'y',
                values: categoryValues.filter(isChartKey),
              },
              color: {
                scale: 'color',
                values: colorValues.filter(isChartKey),
              },
            },
      render: ({ chart, scales, color: resolveColor }) => {
        const categoryScale = orientation === 'y' ? scales.x : scales.y
        if (!isResolvedCategoryScale(categoryScale)) {
          throw new TypeError(
            `violin${orientation.toUpperCase()}: the category axis requires a band or point scale`,
          )
        }
        const positionScale = orientation === 'y' ? scales.y : scales.x
        if (!positionScale) {
          throw new TypeError(
            `violin${orientation.toUpperCase()}: the profile axis scale is required`,
          )
        }
        const plotSpan = orientation === 'y' ? chart.width : chart.height
        const step = resolvedCategoryStep(categoryScale, plotSpan, span)
        const areas: SceneArea[] = []
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
          let positive: (readonly [number, number])[] = []
          let negative: (readonly [number, number])[] = []
          let segmentPoints: ChartPoint<TDatum>[] = []
          let segmentIndex = 0

          const flush = () => {
            if (!positive.length) return
            const reversedNegative = [...negative].reverse()
            const path = violinPath(curve, orientation, positive, negative)
            areas.push({
              kind: 'area',
              key: `${id}:${valueKey(group)}:segment:${segmentIndex}`,
              points: [...positive, ...reversedNegative],
              ...(path ? { path } : {}),
              interaction: {
                points: segmentPoints,
                affinity: orientation,
              },
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.5,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth ?? 1.5,
                strokeDasharray: options.strokeDasharray,
              },
            })
            points.push(...segmentPoints)
            positive = []
            negative = []
            segmentPoints = []
            segmentIndex += 1
          }

          for (const index of indexes) {
            const positionValue = positionValues[index]
            const nextCategory = categoryValues[index]
            const width = widths[index]
            if (
              !isViolinPosition(positionValue) ||
              !isChartKey(nextCategory) ||
              !isFiniteNumber(width)
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
            const halfWidth = (width * span * step) / 2
            const key = `${id}:${valueKey(group)}:${valueKey(keys[index])}`
            const x = orientation === 'y' ? nextBaseline : positionPixel
            const y = orientation === 'y' ? positionPixel : nextBaseline
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: String(nextCategory),
              datum: data[index]!,
              datumIndex: index,
              xValue: orientation === 'y' ? nextCategory : positionValue,
              yValue: orientation === 'y' ? positionValue : nextCategory,
              x,
              y,
              color: fill,
            }
            positive.push(
              orientation === 'y'
                ? [nextBaseline + halfWidth, positionPixel]
                : [positionPixel, nextBaseline - halfWidth],
            )
            negative.push(
              orientation === 'y'
                ? [nextBaseline - halfWidth, positionPixel]
                : [positionPixel, nextBaseline + halfWidth],
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
              className: `ts-chart__area ts-chart__violin ts-chart__violin-${orientation}`,
              ariaHidden: true,
              children: areas,
            },
          ],
          points,
        }
      },
    }
  }, options.motion)
}

function isViolinPosition(value: unknown): value is ViolinPosition {
  return (
    isFiniteNumber(value) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function violinPath(
  curve: ViolinXCurve | ViolinYCurve | undefined,
  orientation: 'x' | 'y',
  positive: readonly (readonly [number, number])[],
  negative: readonly (readonly [number, number])[],
) {
  if (!curve) return undefined
  if (orientation === 'y') {
    if (!('areaX' in curve)) {
      throw new TypeError('violinY: curve must provide an areaX generator')
    }
    return curve.areaX(positive, negative)
  }
  if (!('area' in curve)) {
    throw new TypeError('violinX: curve must provide an area generator')
  }
  return curve.area(positive, negative)
}
