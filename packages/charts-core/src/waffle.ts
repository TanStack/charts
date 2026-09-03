import {
  channelValues,
  inferredKeyValues,
  isChartKey,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { valueKey } from './scales'
import type {
  Channel,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartPoint,
  ChartRectStateStyle,
  SceneNode,
  VisualChannel,
} from './types'

export interface WaffleOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  /** Semantic value represented by one complete cell. Defaults to 1. */
  unit?: number
  /** Rounds cumulative unit boundaries before allocating cells. */
  round?: boolean
  /** Empty pixels between complete cells. Defaults to 1. */
  gap?: number
  radius?: number
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  states?: readonly ChartMarkState<TDatum, ChartRectStateStyle<TDatum>>[]
}

export interface WaffleYOptions<TDatum> extends WaffleOptions<TDatum> {
  y: Channel<TDatum, number | null | undefined>
  /** Fixed cells per row. By default packing follows the final plot bounds. */
  columns?: number
}

export interface WaffleXOptions<TDatum> extends WaffleOptions<TDatum> {
  x: Channel<TDatum, number | null | undefined>
  /** Fixed cells per column. By default packing follows the final plot bounds. */
  rows?: number
}

/** Packs cumulative values left-to-right and then bottom-to-top. */
export function waffleY<TDatum>(
  source: Iterable<TDatum>,
  options: WaffleYOptions<NoInfer<TDatum>>,
): ChartMark<TDatum, ChartKey, number, never, never> {
  return waffle(source, options, 'y')
}

/** Packs cumulative values bottom-to-top and then left-to-right. */
export function waffleX<TDatum>(
  source: Iterable<TDatum>,
  options: WaffleXOptions<NoInfer<TDatum>>,
): ChartMark<TDatum, number, ChartKey, never, never> {
  return waffle(source, options, 'x')
}

type WaffleOrientation = 'x' | 'y'

interface WaffleSegment {
  sourceIndex: number
  value: number
  startValue: number
  endValue: number
  startUnit: number
  endUnit: number
}

interface WaffleFragment {
  x: number
  y: number
  width: number
  height: number
  complete: boolean
}

interface WaffleLayoutSegment extends WaffleSegment {
  fragments: readonly WaffleFragment[]
}

function waffle<TDatum>(
  source: Iterable<TDatum>,
  options: WaffleXOptions<TDatum> | WaffleYOptions<TDatum>,
  orientation: WaffleOrientation,
): ChartMark<TDatum, any, any, never, never> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const unit = options.unit ?? 1
  const gap = options.gap ?? 1
  const fixedMultiple =
    orientation === 'y'
      ? (options as WaffleYOptions<TDatum>).columns
      : (options as WaffleXOptions<TDatum>).rows

  if (!isFiniteNumber(unit) || unit <= 0) {
    throw new TypeError('waffle: unit must be a positive finite number')
  }
  if (!isFiniteNumber(gap) || gap < 0) {
    throw new TypeError('waffle: gap must be a nonnegative finite number')
  }
  if (
    fixedMultiple !== undefined &&
    (!Number.isInteger(fixedMultiple) || fixedMultiple <= 0)
  ) {
    throw new TypeError(
      `waffle${orientation.toUpperCase()}: ${orientation === 'y' ? 'columns' : 'rows'} must be a positive integer`,
    )
  }

  return createMarkWithScaleValues<TDatum, any, any, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `waffle-${orientation}-${markIndex}`
      const valueChannel =
        orientation === 'y'
          ? (options as WaffleYOptions<TDatum>).y
          : (options as WaffleXOptions<TDatum>).x
      const values = channelValues(data, valueChannel, (datum) =>
        typeof datum === 'number' ? datum : undefined,
      )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const groupValues =
        options.z === undefined && options.color !== undefined
          ? colorValues
          : zValues
      const keys = inferredKeyValues(data, options.key, {
        groups: groupValues,
        markId: id,
        warningIdentity: options,
      })
      const segments = materializeSegments(values, unit, options.round ?? false)

      return {
        id,
        states: markStates(data, options.states),
        seriesFromColor: options.z === undefined && options.color !== undefined,
        channels: {
          color: {
            scale: 'color',
            values: colorValues.filter(isChartKey),
          },
        },
        resolveLayout: ({ chart }) => {
          const laidOut = layoutWaffle(
            segments,
            chart,
            orientation,
            fixedMultiple,
            gap,
          )

          return {
            render: ({ color: resolveColor }) => {
              const nodes: SceneNode[] = []
              const points: ChartPoint<TDatum>[] = []

              for (const segment of laidOut) {
                const datum = data[segment.sourceIndex]
                if (segment.fragments.length === 0) continue
                const group = groupValues[segment.sourceIndex] ?? null
                const fallback = resolveColor(
                  colorValues[segment.sourceIndex] ?? null,
                )
                const fill = visualValue(
                  options.fill,
                  datum,
                  segment.sourceIndex,
                  data,
                  fallback,
                )
                const stroke =
                  options.stroke === undefined
                    ? undefined
                    : visualValue(
                        options.stroke,
                        datum,
                        segment.sourceIndex,
                        data,
                        fallback,
                      )
                const key = `${id}:${valueKey(group)}:${valueKey(keys[segment.sourceIndex])}`
                const anchor =
                  segment.fragments[
                    Math.floor((segment.fragments.length - 1) / 2)
                  ]!
                const crossValue = group ?? keys[segment.sourceIndex]!
                const point: ChartPoint<TDatum> = {
                  key,
                  markId: id,
                  group,
                  groupLabel: group == null ? id : String(group),
                  datum,
                  datumIndex: segment.sourceIndex,
                  xValue: orientation === 'y' ? crossValue : segment.value,
                  yValue: orientation === 'y' ? segment.value : crossValue,
                  ...(orientation === 'y'
                    ? {
                        y1Value: segment.startValue,
                        y2Value: segment.endValue,
                        yInterval: 'difference' as const,
                      }
                    : {
                        x1Value: segment.startValue,
                        x2Value: segment.endValue,
                        xInterval: 'difference' as const,
                      }),
                  x: anchor.x + anchor.width / 2,
                  y: anchor.y + anchor.height / 2,
                  color: fill,
                }
                points.push(point)

                segment.fragments.forEach((fragment, fragmentIndex) => {
                  nodes.push({
                    kind: 'rect',
                    key: `${key}:unit:${fragmentIndex}`,
                    x: fragment.x,
                    y: fragment.y,
                    width: fragment.width,
                    height: fragment.height,
                    radius: fragment.complete ? options.radius : undefined,
                    interaction: { point },
                    style: {
                      fill,
                      fillOpacity: options.fillOpacity,
                      stroke,
                      strokeOpacity: options.strokeOpacity,
                      strokeWidth: options.strokeWidth,
                    },
                  })
                })
              }

              return {
                nodes: [
                  {
                    kind: 'group',
                    key: id,
                    className: `ts-chart__waffle ts-chart__waffle-${orientation}`,
                    ariaHidden: true,
                    children: nodes,
                  },
                ],
                points,
              }
            },
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function materializeSegments(
  values: readonly (number | null | undefined)[],
  unit: number,
  round: boolean,
): readonly WaffleSegment[] {
  const segments: WaffleSegment[] = []
  let cumulative = 0

  values.forEach((value, sourceIndex) => {
    if (!isFiniteNumber(value)) return
    if (value < 0) {
      throw new TypeError('waffle: values must be nonnegative finite numbers')
    }
    const startValue = cumulative
    const startUnit = cumulative / unit
    cumulative += value
    const endUnit = cumulative / unit
    const roundedStart = round ? Math.round(startUnit) : startUnit
    const roundedEnd = round ? Math.round(endUnit) : endUnit
    if (
      !Number.isSafeInteger(Math.ceil(roundedStart)) ||
      !Number.isSafeInteger(Math.ceil(roundedEnd))
    ) {
      throw new TypeError(
        'waffle: cumulative unit coordinates must remain finite safe numbers',
      )
    }
    if (roundedEnd <= roundedStart) return
    segments.push({
      sourceIndex,
      value,
      startValue,
      endValue: cumulative,
      startUnit: roundedStart,
      endUnit: roundedEnd,
    })
  })

  return segments
}

function layoutWaffle(
  segments: readonly WaffleSegment[],
  chart: ChartBounds,
  orientation: WaffleOrientation,
  fixedMultiple: number | undefined,
  gap: number,
): readonly WaffleLayoutSegment[] {
  const cellCount = Math.ceil(segments.at(-1)?.endUnit ?? 0)
  if (cellCount <= 0) return []
  const multiple =
    fixedMultiple ?? chooseMultiple(cellCount, chart, orientation)
  const columns =
    orientation === 'y' ? multiple : Math.ceil(cellCount / multiple)
  const rows = orientation === 'y' ? Math.ceil(cellCount / multiple) : multiple
  const cellSize = Math.max(
    0,
    Math.min(chart.width / columns, chart.height / rows),
  )
  const gridWidth = columns * cellSize
  const gridHeight = rows * cellSize
  const gridX = chart.x + (chart.width - gridWidth) / 2
  const gridY = chart.y + (chart.height - gridHeight) / 2
  const inset = Math.min(gap, cellSize) / 2
  const paintSize = Math.max(0, cellSize - inset * 2)

  return segments.map((segment) => {
    const fragments: WaffleFragment[] = []
    const firstCell = Math.floor(segment.startUnit)
    const lastCell = Math.ceil(segment.endUnit)

    for (let unitIndex = firstCell; unitIndex < lastCell; unitIndex += 1) {
      const start = Math.max(segment.startUnit, unitIndex) - unitIndex
      const end = Math.min(segment.endUnit, unitIndex + 1) - unitIndex
      if (end <= start) continue
      const column =
        orientation === 'y' ? unitIndex % columns : Math.floor(unitIndex / rows)
      const row =
        orientation === 'y' ? Math.floor(unitIndex / columns) : unitIndex % rows
      const cellX = gridX + column * cellSize + inset
      const cellY = gridY + (rows - row - 1) * cellSize + inset
      const complete = start === 0 && end === 1

      fragments.push(
        orientation === 'y'
          ? {
              x: cellX,
              y: cellY + (1 - end) * paintSize,
              width: paintSize,
              height: (end - start) * paintSize,
              complete,
            }
          : {
              x: cellX + start * paintSize,
              y: cellY,
              width: (end - start) * paintSize,
              height: paintSize,
              complete,
            },
      )
    }

    return { ...segment, fragments }
  })
}

function chooseMultiple(
  cellCount: number,
  chart: ChartBounds,
  orientation: WaffleOrientation,
): number {
  let best = 1
  let bestSize = -1
  let bestUnused = Infinity

  for (let candidate = 1; candidate <= cellCount; candidate += 1) {
    const columns =
      orientation === 'y' ? candidate : Math.ceil(cellCount / candidate)
    const rows =
      orientation === 'y' ? Math.ceil(cellCount / candidate) : candidate
    const size = Math.min(chart.width / columns, chart.height / rows)
    const unused = chart.width * chart.height - columns * rows * size * size
    if (size > bestSize || (size === bestSize && unused < bestUnused)) {
      best = candidate
      bestSize = size
      bestUnused = unused
    }
  }

  return best
}
