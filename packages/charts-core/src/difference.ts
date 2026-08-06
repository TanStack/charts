import { areaX } from './area-x'
import { areaY } from './area'
import { lineX, lineY } from './line'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isFiniteNumber,
} from './mark'
import { initializeCompositeMark } from './mark-composite-internal'
import { adoptResolvedChildMark } from './resolved-layout-child'
import { valueKey } from './scales'
import type { TransformLineage } from './transform'
import { groupedIndexes } from './transform-internal'
import type {
  Channel,
  ChannelOutput,
  ChartKey,
  ChartLineStateStyle,
  ChartMark,
  ChartMarkState,
  ChartMotionDefinition,
  ResolvedScale,
  VisualChannel,
} from './types'

export type DifferenceIndependent = number | Date

export type DifferenceSign = 'positive' | 'negative'

/** One source or interpolated boundary point in a difference-area lobe. */
export interface DifferenceAreaDatum<
  TDatum,
  TIndependent extends DifferenceIndependent = DifferenceIndependent,
> extends TransformLineage<TDatum> {
  readonly kind: 'difference-area'
  readonly independent: TIndependent
  readonly comparison: number
  readonly primary: number
  readonly sign: DifferenceSign
  readonly segment: string
  readonly crossing: boolean
  readonly markKey: ChartKey
}

/** Raw line data plus the derived, decorative difference-area data. */
export type DifferenceDatum<
  TDatum,
  TIndependent extends DifferenceIndependent = DifferenceIndependent,
> = TDatum | DifferenceAreaDatum<TDatum, TIndependent>

interface DifferenceOptions<
  TDatum,
  TIndependent extends DifferenceIndependent,
> {
  id?: string
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  positiveFill?: VisualChannel<
    DifferenceAreaDatum<TDatum, TIndependent>,
    string
  > | null
  negativeFill?: VisualChannel<
    DifferenceAreaDatum<TDatum, TIndependent>,
    string
  > | null
  fillOpacity?: number
  positiveFillOpacity?: number
  negativeFillOpacity?: number
  /** Paint for the primary boundary line. */
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  /** Paint for the comparison boundary line. */
  comparisonStroke?: VisualChannel<TDatum, string>
  comparisonStrokeOpacity?: number
  comparisonStrokeWidth?: number
  comparisonStrokeDasharray?: string
  points?: boolean
  states?: readonly ChartMarkState<TDatum, ChartLineStateStyle<TDatum>>[]
  comparisonStates?: readonly ChartMarkState<
    TDatum,
    ChartLineStateStyle<TDatum>
  >[]
  motion?: ChartMotionDefinition<DifferenceDatum<TDatum, TIndependent>>
}

export interface DifferenceYOptions<
  TDatum,
  TIndependent extends DifferenceIndependent = DifferenceIndependent,
> extends DifferenceOptions<TDatum, TIndependent> {
  x: Channel<TDatum, TIndependent | null | undefined>
  y1: number | Channel<TDatum, number | null | undefined>
  y2: number | Channel<TDatum, number | null | undefined>
}

export interface DifferenceXOptions<
  TDatum,
  TIndependent extends DifferenceIndependent = DifferenceIndependent,
> extends DifferenceOptions<TDatum, TIndependent> {
  x1: number | Channel<TDatum, number | null | undefined>
  x2: number | Channel<TDatum, number | null | undefined>
  y: Channel<TDatum, TIndependent | null | undefined>
}

type IndependentOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  DifferenceIndependent
>

type DifferenceYCallOptions<
  TDatum,
  TXChannel extends Channel<
    NoInfer<TDatum>,
    DifferenceIndependent | null | undefined
  >,
> = Omit<
  DifferenceYOptions<NoInfer<TDatum>, IndependentOutput<TDatum, TXChannel>>,
  'x'
> & {
  x: TXChannel
}

type DifferenceXCallOptions<
  TDatum,
  TYChannel extends Channel<
    NoInfer<TDatum>,
    DifferenceIndependent | null | undefined
  >,
> = Omit<
  DifferenceXOptions<NoInfer<TDatum>, IndependentOutput<TDatum, TYChannel>>,
  'y'
> & {
  y: TYChannel
}

/** Compares two vertical values and fills their positive and negative lobes. */
export function differenceY<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    DifferenceIndependent | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: DifferenceYCallOptions<TDatum, TXChannel>,
): ChartMark<
  DifferenceDatum<TDatum, IndependentOutput<TDatum, TXChannel>>,
  IndependentOutput<TDatum, TXChannel>,
  number
>
export function differenceY<TDatum>(
  source: Iterable<TDatum>,
  options: DifferenceYOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return difference(source, options, options.x, options.y1, options.y2, 'y')
}

/** Compares two horizontal values and fills their positive and negative lobes. */
export function differenceX<
  TDatum,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    DifferenceIndependent | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: DifferenceXCallOptions<TDatum, TYChannel>,
): ChartMark<
  DifferenceDatum<TDatum, IndependentOutput<TDatum, TYChannel>>,
  number,
  IndependentOutput<TDatum, TYChannel>
>
export function differenceX<TDatum>(
  source: Iterable<TDatum>,
  options: DifferenceXOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  return difference(source, options, options.y, options.x1, options.x2, 'x')
}

interface DifferencePoint<
  TDatum,
  TIndependent extends DifferenceIndependent,
> extends TransformLineage<TDatum> {
  independent: TIndependent
  comparison: number
  primary: number
  independentPosition: number
  comparisonPosition: number
  primaryPosition: number
  crossing: boolean
  pointKey: string
}

interface DifferenceLobe<TDatum, TIndependent extends DifferenceIndependent> {
  sign: DifferenceSign
  groupKey: string
  points: readonly DifferencePoint<TDatum, TIndependent>[]
}

interface DifferenceScales {
  owner: 'differenceX' | 'differenceY'
  independentAxis: 'x' | 'y'
  dependentAxis: 'x' | 'y'
  independent: ResolvedScale
  dependent: ResolvedScale
}

const interactiveDifferenceChildren = new Set(['comparison', 'primary'])

function difference<TDatum, TIndependent extends DifferenceIndependent>(
  source: Iterable<TDatum>,
  options: DifferenceOptions<TDatum, TIndependent>,
  independent: Channel<TDatum, TIndependent | null | undefined>,
  comparison: number | Channel<TDatum, number | null | undefined>,
  primary: number | Channel<TDatum, number | null | undefined>,
  orientation: 'x' | 'y',
): ChartMark<any, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `difference-${orientation}-${markIndex}`
    const independentValues = channelValues(data, independent, () => undefined)
    const comparisonValues = numericValues(data, comparison)
    const primaryValues = numericValues(data, primary)
    const groupValues = channelValues(data, options.z, () => null)
    validateIndependentValues(
      independentValues,
      comparisonValues,
      primaryValues,
      orientation,
    )
    const keys = inferredKeyValues(data, options.key, {
      groups: groupValues,
      candidates: [independentValues],
      markId: id,
      warningIdentity: options,
    })
    const semanticValid = data.map(
      (_datum, index) =>
        isIndependent(independentValues[index]) &&
        isFiniteNumber(comparisonValues[index]) &&
        isFiniteNumber(primaryValues[index]),
    )
    const domainIndependent = independentValues.filter(
      (_value, index): _value is TIndependent => semanticValid[index]!,
    )
    const domainDependent = [
      ...comparisonValues.filter(
        (_value, index): _value is number => semanticValid[index]!,
      ),
      ...primaryValues.filter(
        (_value, index): _value is number => semanticValid[index]!,
      ),
    ]

    return {
      id,
      channels:
        orientation === 'y'
          ? {
              x: { scale: 'x', values: domainIndependent },
              y: { scale: 'y', values: domainDependent },
            }
          : {
              x: { scale: 'x', values: domainDependent },
              y: { scale: 'y', values: domainIndependent },
            },
      resolveLayout: ({ scales }) => {
        const projection = resolveDifferenceScales(scales, orientation)
        const positions = projectDifferenceValues(
          independentValues,
          comparisonValues,
          primaryValues,
          projection,
        )
        const lobes = differenceLobes(
          data,
          independentValues,
          comparisonValues,
          primaryValues,
          positions.independent,
          positions.comparison,
          positions.primary,
          groupValues,
          keys,
          projection,
        )
        const children = differenceChildren(
          data,
          options,
          orientation,
          materializeAreaRows(lobes),
          independentValues,
          comparisonValues,
          primaryValues,
          groupValues,
          keys,
          positions.valid,
        )
        return adoptResolvedChildMark(
          initializeCompositeMark(id, children, {
            interactiveChildren: interactiveDifferenceChildren,
          }),
        )
      },
    }
  }, options.motion)
}

function differenceChildren<TDatum, TIndependent extends DifferenceIndependent>(
  data: readonly TDatum[],
  options: DifferenceOptions<TDatum, TIndependent>,
  orientation: 'x' | 'y',
  areas: {
    positive: DifferenceAreaDatum<TDatum, TIndependent>[]
    negative: DifferenceAreaDatum<TDatum, TIndependent>[]
  },
  independentValues: readonly (TIndependent | null | undefined)[],
  comparisonValues: readonly (number | null | undefined)[],
  primaryValues: readonly (number | null | undefined)[],
  groupValues: readonly (ChartKey | null | undefined)[],
  keys: readonly ChartKey[],
  sharedValid: readonly boolean[],
): ChartMark<any, any, any>[] {
  const lineIndependent = (_datum: TDatum, { index }: { index: number }) =>
    sharedValid[index] ? independentValues[index] : undefined
  const comparisonValue = (_datum: TDatum, { index }: { index: number }) =>
    sharedValid[index] ? comparisonValues[index] : undefined
  const primaryValue = (_datum: TDatum, { index }: { index: number }) =>
    sharedValid[index] ? primaryValues[index] : undefined
  const lineGroup = (_datum: TDatum, { index }: { index: number }) =>
    isChartKey(groupValues[index]) ? groupValues[index] : null
  const lineKey = (_datum: TDatum, { index }: { index: number }) =>
    keys[index] ?? index
  const noColor = () => null
  const children: ChartMark<any, any, any>[] = []

  if (options.positiveFill !== null) {
    children.push(
      orientation === 'y'
        ? areaY(areas.positive, {
            id: 'positive',
            x: (datum) => datum.independent,
            y1: 'comparison',
            y2: 'primary',
            z: 'segment',
            color: noColor,
            key: 'markKey',
            fill: options.positiveFill ?? '#3ca951',
            fillOpacity:
              options.positiveFillOpacity ?? options.fillOpacity ?? 0.2,
          })
        : areaX(areas.positive, {
            id: 'positive',
            x1: 'comparison',
            x2: 'primary',
            y: (datum) => datum.independent,
            z: 'segment',
            color: noColor,
            key: 'markKey',
            fill: options.positiveFill ?? '#3ca951',
            fillOpacity:
              options.positiveFillOpacity ?? options.fillOpacity ?? 0.2,
          }),
    )
  }
  if (options.negativeFill !== null) {
    children.push(
      orientation === 'y'
        ? areaY(areas.negative, {
            id: 'negative',
            x: (datum) => datum.independent,
            y1: 'comparison',
            y2: 'primary',
            z: 'segment',
            color: noColor,
            key: 'markKey',
            fill: options.negativeFill ?? '#4269d0',
            fillOpacity:
              options.negativeFillOpacity ?? options.fillOpacity ?? 0.2,
          })
        : areaX(areas.negative, {
            id: 'negative',
            x1: 'comparison',
            x2: 'primary',
            y: (datum) => datum.independent,
            z: 'segment',
            color: noColor,
            key: 'markKey',
            fill: options.negativeFill ?? '#4269d0',
            fillOpacity:
              options.negativeFillOpacity ?? options.fillOpacity ?? 0.2,
          }),
    )
  }

  children.push(
    orientation === 'y'
      ? lineY(data, {
          id: 'comparison',
          x: lineIndependent,
          y: comparisonValue,
          z: lineGroup,
          color: noColor,
          key: lineKey,
          stroke: options.comparisonStroke ?? '#64748b',
          strokeOpacity:
            options.comparisonStrokeOpacity ?? options.strokeOpacity,
          strokeWidth:
            options.comparisonStrokeWidth ?? options.strokeWidth ?? 2.25,
          strokeDasharray: options.comparisonStrokeDasharray,
          points: options.points,
          states: options.comparisonStates,
        })
      : lineX(data, {
          id: 'comparison',
          x: comparisonValue,
          y: lineIndependent,
          z: lineGroup,
          color: noColor,
          key: lineKey,
          stroke: options.comparisonStroke ?? '#64748b',
          strokeOpacity:
            options.comparisonStrokeOpacity ?? options.strokeOpacity,
          strokeWidth:
            options.comparisonStrokeWidth ?? options.strokeWidth ?? 2.25,
          strokeDasharray: options.comparisonStrokeDasharray,
          points: options.points,
          states: options.comparisonStates,
        }),
    orientation === 'y'
      ? lineY(data, {
          id: 'primary',
          x: lineIndependent,
          y: primaryValue,
          z: lineGroup,
          color: noColor,
          key: lineKey,
          stroke: options.stroke ?? 'currentColor',
          strokeOpacity: options.strokeOpacity,
          strokeWidth: options.strokeWidth,
          strokeDasharray: options.strokeDasharray,
          points: options.points,
          states: options.states,
        })
      : lineX(data, {
          id: 'primary',
          x: primaryValue,
          y: lineIndependent,
          z: lineGroup,
          color: noColor,
          key: lineKey,
          stroke: options.stroke ?? 'currentColor',
          strokeOpacity: options.strokeOpacity,
          strokeWidth: options.strokeWidth,
          strokeDasharray: options.strokeDasharray,
          points: options.points,
          states: options.states,
        }),
  )

  return children
}

function numericValues<TDatum>(
  data: readonly TDatum[],
  value: number | Channel<TDatum, number | null | undefined>,
): (number | null | undefined)[] {
  return typeof value === 'number'
    ? data.map(() => value)
    : channelValues(data, value, () => undefined)
}

function resolveDifferenceScales(
  scales: Readonly<Record<string, ResolvedScale>>,
  orientation: 'x' | 'y',
): DifferenceScales {
  const owner = orientation === 'y' ? 'differenceY' : 'differenceX'
  const x = scales.x
  const y = scales.y
  if (!x || !y) {
    throw new TypeError(`${owner}: x and y scales are required`)
  }
  if (!x.invert || !y.invert) {
    throw new TypeError(`${owner}: x and y scales must support inversion`)
  }
  return orientation === 'y'
    ? {
        owner,
        independentAxis: 'x',
        dependentAxis: 'y',
        independent: x,
        dependent: y,
      }
    : {
        owner,
        independentAxis: 'y',
        dependentAxis: 'x',
        independent: y,
        dependent: x,
      }
}

function projectDifferenceValues<TIndependent extends DifferenceIndependent>(
  independentValues: readonly (TIndependent | null | undefined)[],
  comparisonValues: readonly (number | null | undefined)[],
  primaryValues: readonly (number | null | undefined)[],
  scales: DifferenceScales,
): {
  independent: (number | undefined)[]
  comparison: (number | undefined)[]
  primary: (number | undefined)[]
  valid: boolean[]
} {
  const independent: (number | undefined)[] = []
  const comparison: (number | undefined)[] = []
  const primary: (number | undefined)[] = []
  const valid: boolean[] = []

  for (let index = 0; index < independentValues.length; index += 1) {
    const independentValue = independentValues[index]
    const comparisonValue = comparisonValues[index]
    const primaryValue = primaryValues[index]
    if (
      !isIndependent(independentValue) ||
      !isFiniteNumber(comparisonValue) ||
      !isFiniteNumber(primaryValue)
    ) {
      independent.push(undefined)
      comparison.push(undefined)
      primary.push(undefined)
      valid.push(false)
      continue
    }
    const independentPosition = scales.independent.map(independentValue)
    const comparisonPosition = scales.dependent.map(comparisonValue)
    const primaryPosition = scales.dependent.map(primaryValue)
    const rowValid =
      isFiniteNumber(independentPosition) &&
      isFiniteNumber(comparisonPosition) &&
      isFiniteNumber(primaryPosition)
    independent.push(rowValid ? independentPosition : undefined)
    comparison.push(rowValid ? comparisonPosition : undefined)
    primary.push(rowValid ? primaryPosition : undefined)
    valid.push(rowValid)
  }

  return { independent, comparison, primary, valid }
}

function validateIndependentValues(
  values: readonly unknown[],
  comparisonValues: readonly unknown[],
  primaryValues: readonly unknown[],
  orientation: 'x' | 'y',
): void {
  let kind: 'number' | 'date' | undefined
  for (let index = 0; index < values.length; index += 1) {
    if (
      !isFiniteNumber(comparisonValues[index]) ||
      !isFiniteNumber(primaryValues[index])
    ) {
      continue
    }
    const value = values[index]
    if (!isIndependent(value)) continue
    const nextKind = value instanceof Date ? 'date' : 'number'
    if (kind !== undefined && kind !== nextKind) {
      throw new TypeError(
        `difference${orientation.toUpperCase()}: independent values cannot mix numbers and Dates`,
      )
    }
    kind = nextKind
  }
}

function differenceLobes<TDatum, TIndependent extends DifferenceIndependent>(
  data: readonly TDatum[],
  independentValues: readonly (TIndependent | null | undefined)[],
  comparisonValues: readonly (number | null | undefined)[],
  primaryValues: readonly (number | null | undefined)[],
  independentPositions: readonly (number | undefined)[],
  comparisonPositions: readonly (number | undefined)[],
  primaryPositions: readonly (number | undefined)[],
  groupValues: readonly (ChartKey | null | undefined)[],
  keys: readonly ChartKey[],
  scales: DifferenceScales,
): DifferenceLobe<TDatum, TIndependent>[] {
  const lobes: DifferenceLobe<TDatum, TIndependent>[] = []
  const groups = groupValues.map((group) => (isChartKey(group) ? group : null))
  for (const { key: group, indexes } of groupedIndexes(groups)) {
    const groupKey = valueKey(group)
    let block: DifferencePoint<TDatum, TIndependent>[] = []
    const flush = () => {
      if (block.length > 1) {
        lobes.push(...blockLobes(block, groupKey, scales))
      }
      block = []
    }

    for (const sourceIndex of indexes) {
      const independent = independentValues[sourceIndex]
      const comparison = comparisonValues[sourceIndex]
      const primary = primaryValues[sourceIndex]
      const independentPosition = independentPositions[sourceIndex]
      const comparisonPosition = comparisonPositions[sourceIndex]
      const primaryPosition = primaryPositions[sourceIndex]
      if (
        !isIndependent(independent) ||
        !isFiniteNumber(comparison) ||
        !isFiniteNumber(primary) ||
        !isFiniteNumber(independentPosition) ||
        !isFiniteNumber(comparisonPosition) ||
        !isFiniteNumber(primaryPosition)
      ) {
        flush()
        continue
      }
      block.push({
        independent,
        comparison,
        primary,
        independentPosition,
        comparisonPosition,
        primaryPosition,
        crossing: false,
        pointKey: `source:${valueKey(keys[sourceIndex])}`,
        source: [data[sourceIndex] as TDatum],
        sourceIndexes: [sourceIndex],
      })
    }
    flush()
  }
  return lobes
}

function blockLobes<TDatum, TIndependent extends DifferenceIndependent>(
  block: readonly DifferencePoint<TDatum, TIndependent>[],
  groupKey: string,
  scales: DifferenceScales,
): DifferenceLobe<TDatum, TIndependent>[] {
  const augmented: DifferencePoint<TDatum, TIndependent>[] = []
  block.forEach((point, index) => {
    const previous = block[index - 1]
    if (previous && signOf(previous) !== signOf(point)) {
      const previousSign = signOf(previous)
      const nextSign = signOf(point)
      if (previousSign !== undefined && nextSign !== undefined) {
        augmented.push(crossingPoint(previous, point, scales))
      }
    }
    augmented.push(point)
  })

  const lobes: DifferenceLobe<TDatum, TIndependent>[] = []
  let activeSign: DifferenceSign | undefined
  let activePoints: DifferencePoint<TDatum, TIndependent>[] = []
  let carriedSign: DifferenceSign | undefined

  const flush = () => {
    if (activeSign !== undefined && activePoints.length > 1) {
      lobes.push({ sign: activeSign, groupKey, points: activePoints })
    }
    activeSign = undefined
    activePoints = []
  }

  for (let index = 0; index < augmented.length - 1; index += 1) {
    const left = augmented[index]
    const right = augmented[index + 1]
    if (!left || !right) continue
    const intervalSign =
      signOf(left) ??
      signOf(right) ??
      carriedSign ??
      nextSign(augmented, index + 2)
    if (intervalSign === undefined) {
      flush()
      continue
    }
    carriedSign = intervalSign
    if (activeSign !== intervalSign) {
      flush()
      activeSign = intervalSign
      activePoints = [left, right]
    } else {
      activePoints.push(right)
    }
  }
  flush()
  return lobes
}

function nextSign<TDatum, TIndependent extends DifferenceIndependent>(
  points: readonly DifferencePoint<TDatum, TIndependent>[],
  start: number,
): DifferenceSign | undefined {
  for (let index = start; index < points.length; index += 1) {
    const point = points[index]
    if (!point) continue
    const sign = signOf(point)
    if (sign !== undefined) return sign
  }
  return undefined
}

function signOf<TDatum, TIndependent extends DifferenceIndependent>(
  point: DifferencePoint<TDatum, TIndependent>,
): DifferenceSign | undefined {
  const difference = point.primary - point.comparison
  return difference === 0 ? undefined : difference > 0 ? 'positive' : 'negative'
}

function crossingPoint<TDatum, TIndependent extends DifferenceIndependent>(
  left: DifferencePoint<TDatum, TIndependent>,
  right: DifferencePoint<TDatum, TIndependent>,
  scales: DifferenceScales,
): DifferencePoint<TDatum, TIndependent> {
  const ratio = crossingRatio(left, right, scales.owner)
  const independentPosition = interpolateNumber(
    left.independentPosition,
    right.independentPosition,
    ratio,
  )
  const primaryPosition = interpolateNumber(
    left.primaryPosition,
    right.primaryPosition,
    ratio,
  )
  const comparisonPosition = interpolateNumber(
    left.comparisonPosition,
    right.comparisonPosition,
    ratio,
  )
  const boundaryPosition = (primaryPosition + comparisonPosition) / 2
  const independent = scales.independent.invert!(independentPosition)
  const boundary = scales.dependent.invert!(boundaryPosition)
  if (
    !isIndependent(independent) ||
    independent instanceof Date !== left.independent instanceof Date
  ) {
    throw new TypeError(
      `${scales.owner}: ${scales.independentAxis} scale must invert crossings to ${left.independent instanceof Date ? 'valid Dates' : 'finite numbers'}`,
    )
  }
  if (!isFiniteNumber(boundary)) {
    throw new TypeError(
      `${scales.owner}: ${scales.dependentAxis} scale must invert crossings to finite numbers`,
    )
  }
  return {
    independent: independent as TIndependent,
    comparison: boundary,
    primary: boundary,
    independentPosition,
    comparisonPosition: boundaryPosition,
    primaryPosition: boundaryPosition,
    crossing: true,
    pointKey: `crossing:${left.pointKey}:${right.pointKey}`,
    source: [...left.source, ...right.source],
    sourceIndexes: [...left.sourceIndexes, ...right.sourceIndexes],
  }
}

function crossingRatio<TDatum, TIndependent extends DifferenceIndependent>(
  left: DifferencePoint<TDatum, TIndependent>,
  right: DifferencePoint<TDatum, TIndependent>,
  owner: DifferenceScales['owner'],
): number {
  const leftDifference = left.primaryPosition - left.comparisonPosition
  const rightDifference = right.primaryPosition - right.comparisonPosition
  if (leftDifference === 0 && rightDifference === 0) return 0.5
  if (leftDifference === 0) return 0
  if (rightDifference === 0) return 1
  if (leftDifference > 0 === rightDifference > 0) {
    throw new TypeError(
      `${owner}: dependent scale must preserve boundary order within each segment`,
    )
  }
  const leftMagnitude = Math.abs(leftDifference)
  const rightMagnitude = Math.abs(rightDifference)
  const scale = Math.max(leftMagnitude, rightMagnitude)
  const normalizedLeft = leftMagnitude / scale
  const normalizedRight = rightMagnitude / scale
  return normalizedLeft / (normalizedLeft + normalizedRight)
}

function interpolateNumber(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio
}

function materializeAreaRows<
  TDatum,
  TIndependent extends DifferenceIndependent,
>(
  lobes: readonly DifferenceLobe<TDatum, TIndependent>[],
): {
  positive: DifferenceAreaDatum<TDatum, TIndependent>[]
  negative: DifferenceAreaDatum<TDatum, TIndependent>[]
} {
  const positive: DifferenceAreaDatum<TDatum, TIndependent>[] = []
  const negative: DifferenceAreaDatum<TDatum, TIndependent>[] = []
  lobes.forEach((lobe) => {
    const first = lobe.points[0]
    const last = lobe.points[lobe.points.length - 1]
    if (!first || !last) return
    const segment = `${lobe.groupKey}:${lobe.sign}:${first.pointKey}:${last.pointKey}`
    const target = lobe.sign === 'positive' ? positive : negative
    lobe.points.forEach((point) => {
      target.push({
        kind: 'difference-area',
        independent: point.independent,
        comparison: point.comparison,
        primary: point.primary,
        sign: lobe.sign,
        segment,
        crossing: point.crossing,
        markKey: `${segment}:${point.pointKey}`,
        source: point.source,
        sourceIndexes: point.sourceIndexes,
      })
    })
  })
  return { positive, negative }
}

function isIndependent(value: unknown): value is DifferenceIndependent {
  return (
    isFiniteNumber(value) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}
