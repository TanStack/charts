import { areaY } from './area'
import { areaX } from './area-x'
import { lineX, lineY } from './line'
import { channelValues, createMark, isChartKey, isFiniteNumber } from './mark'
import { initializeCompositeMark } from './mark-composite-internal'
import { valueKey } from './scales'
import { groupedIndexes } from './transform-internal'
import type { TransformLineage } from './transform'
import type {
  Channel,
  ChannelOutput,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMotionDefinition,
} from './types'

type RegressionIndependentValue = number | Date

interface LinearRegressionOptions<
  TDatum,
  TRegressionDatum,
> extends ChartMarkMotionOptions<TRegressionDatum> {
  id?: string
  /** Fits one independent regression for each series value. */
  z?: Channel<TDatum, ChartKey | null | undefined>
  /** Confidence level for the fitted mean. Defaults to 0.95; use 0 to hide. */
  ci?: number
  /** Number of semantic independent-domain samples. Defaults to 64. */
  samples?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  /** Defaults to the line stroke. */
  fill?: string
  fillOpacity?: number
}

export interface LinearRegressionYDatum<
  TDatum,
  TXValue extends RegressionIndependentValue = RegressionIndependentValue,
> extends TransformLineage<TDatum> {
  readonly x: TXValue
  readonly y: number
  readonly y1?: number
  readonly y2?: number
  readonly group: ChartKey | null
}

export interface LinearRegressionXDatum<
  TDatum,
  TYValue extends RegressionIndependentValue = RegressionIndependentValue,
> extends TransformLineage<TDatum> {
  readonly x: number
  readonly x1?: number
  readonly x2?: number
  readonly y: TYValue
  readonly group: ChartKey | null
}

export interface LinearRegressionYOptions<
  TDatum,
> extends LinearRegressionOptions<TDatum, LinearRegressionYDatum<TDatum>> {
  x: Channel<TDatum, RegressionIndependentValue | null | undefined>
  y: Channel<TDatum, number | null | undefined>
}

export interface LinearRegressionXOptions<
  TDatum,
> extends LinearRegressionOptions<TDatum, LinearRegressionXDatum<TDatum>> {
  x: Channel<TDatum, number | null | undefined>
  y: Channel<TDatum, RegressionIndependentValue | null | undefined>
}

type IndependentOutput<TDatum, TChannel> = Extract<
  ChannelOutput<TDatum, TChannel, number>,
  RegressionIndependentValue
>

type LinearRegressionYCallOptions<
  TDatum,
  TXChannel extends Channel<
    NoInfer<TDatum>,
    RegressionIndependentValue | null | undefined
  >,
> = Omit<LinearRegressionYOptions<NoInfer<TDatum>>, 'motion' | 'x'> & {
  x: TXChannel
  motion?: ChartMotionDefinition<
    LinearRegressionYDatum<TDatum, IndependentOutput<TDatum, TXChannel>>
  >
}

type LinearRegressionXCallOptions<
  TDatum,
  TYChannel extends Channel<
    NoInfer<TDatum>,
    RegressionIndependentValue | null | undefined
  >,
> = Omit<LinearRegressionXOptions<NoInfer<TDatum>>, 'motion' | 'y'> & {
  y: TYChannel
  motion?: ChartMotionDefinition<
    LinearRegressionXDatum<TDatum, IndependentOutput<TDatum, TYChannel>>
  >
}

interface RegressionSample<TDatum> extends TransformLineage<TDatum> {
  readonly independent: RegressionIndependentValue
  readonly predicted: number
  readonly lower?: number
  readonly upper?: number
  readonly group: ChartKey | null
  readonly markKey: string
}

interface RegressionObservation {
  readonly sourceIndex: number
  readonly independent: number
  readonly dependent: number
}

interface RegressionFit {
  readonly count: number
  readonly meanIndependent: number
  readonly meanDependent: number
  readonly sumIndependentSquares: number
  readonly slope: number
  readonly residualStandardError?: number
  readonly criticalValue?: number
}

const interactiveRegressionChildren = new Set(['line'])

/** Fits least-squares y-values from raw observations. */
export function linearRegressionY<
  TDatum,
  const TXChannel extends Channel<
    NoInfer<TDatum>,
    RegressionIndependentValue | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: LinearRegressionYCallOptions<TDatum, TXChannel>,
): ChartMark<
  LinearRegressionYDatum<TDatum, IndependentOutput<TDatum, TXChannel>>,
  IndependentOutput<TDatum, TXChannel>,
  number
>
export function linearRegressionY<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionYOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `linear-regression-y-${markIndex}`
    const normalized = normalizeRegressionOptions(options, 'linearRegressionY')
    const samples = regressionSamples(
      data,
      channelValues(data, options.x, () => undefined),
      channelValues(data, options.y, () => undefined),
      channelValues(data, options.z, () => null),
      normalized,
      'linearRegressionY',
    )
    const rows: RegressionYSample<TDatum>[] = samples.map((sample) => ({
      x: sample.independent,
      y: sample.predicted,
      ...(sample.lower === undefined ? {} : { y1: sample.lower }),
      ...(sample.upper === undefined ? {} : { y2: sample.upper }),
      group: sample.group,
      source: sample.source,
      sourceIndexes: sample.sourceIndexes,
      markKey: sample.markKey,
    }))
    const children = [
      ...(normalized.ci === 0
        ? []
        : [
            areaY(rows, {
              id: 'band',
              x: 'x',
              y: 'y',
              y1: 'y1',
              y2: 'y2',
              z: 'group',
              key: 'markKey',
              fill: options.fill ?? options.stroke,
              fillOpacity: options.fillOpacity ?? 0.1,
            }),
          ]),
      lineY(rows, {
        id: 'line',
        x: 'x',
        y: 'y',
        z: 'group',
        key: 'markKey',
        stroke: options.stroke,
        strokeOpacity: options.strokeOpacity,
        strokeWidth: options.strokeWidth ?? 1.5,
        strokeDasharray: options.strokeDasharray,
      }),
    ]

    return initializeCompositeMark(id, children, {
      motion: options.motion,
      interactiveChildren: interactiveRegressionChildren,
    })
  })
}

/** Fits least-squares x-values from raw observations. */
export function linearRegressionX<
  TDatum,
  const TYChannel extends Channel<
    NoInfer<TDatum>,
    RegressionIndependentValue | null | undefined
  >,
>(
  source: Iterable<TDatum>,
  options: LinearRegressionXCallOptions<TDatum, TYChannel>,
): ChartMark<
  LinearRegressionXDatum<TDatum, IndependentOutput<TDatum, TYChannel>>,
  number,
  IndependentOutput<TDatum, TYChannel>
>
export function linearRegressionX<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionXOptions<NoInfer<TDatum>>,
): ChartMark<any, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `linear-regression-x-${markIndex}`
    const normalized = normalizeRegressionOptions(options, 'linearRegressionX')
    const samples = regressionSamples(
      data,
      channelValues(data, options.y, () => undefined),
      channelValues(data, options.x, () => undefined),
      channelValues(data, options.z, () => null),
      normalized,
      'linearRegressionX',
    )
    const rows: RegressionXSample<TDatum>[] = samples.map((sample) => ({
      x: sample.predicted,
      ...(sample.lower === undefined ? {} : { x1: sample.lower }),
      ...(sample.upper === undefined ? {} : { x2: sample.upper }),
      y: sample.independent,
      group: sample.group,
      source: sample.source,
      sourceIndexes: sample.sourceIndexes,
      markKey: sample.markKey,
    }))
    const children = [
      ...(normalized.ci === 0
        ? []
        : [
            areaX(rows, {
              id: 'band',
              x: 'x',
              x1: 'x1',
              x2: 'x2',
              y: 'y',
              z: 'group',
              key: 'markKey',
              fill: options.fill ?? options.stroke,
              fillOpacity: options.fillOpacity ?? 0.1,
            }),
          ]),
      lineX(rows, {
        id: 'line',
        x: 'x',
        y: 'y',
        z: 'group',
        key: 'markKey',
        stroke: options.stroke,
        strokeOpacity: options.strokeOpacity,
        strokeWidth: options.strokeWidth ?? 1.5,
        strokeDasharray: options.strokeDasharray,
      }),
    ]

    return initializeCompositeMark(id, children, {
      motion: options.motion,
      interactiveChildren: interactiveRegressionChildren,
    })
  })
}

type RegressionYSample<TDatum> = LinearRegressionYDatum<TDatum> & {
  readonly markKey: string
}

type RegressionXSample<TDatum> = LinearRegressionXDatum<TDatum> & {
  readonly markKey: string
}

function normalizeRegressionOptions(
  options: { ci?: number; samples?: number },
  owner: 'linearRegressionX' | 'linearRegressionY',
): { ci: number; samples: number } {
  const ci = options.ci ?? 0.95
  const samples = options.samples ?? 64
  if (!Number.isFinite(ci) || ci < 0 || ci >= 1) {
    throw new TypeError(`${owner}: ci must be a finite number in [0, 1)`)
  }
  if (!Number.isInteger(samples) || samples < 2) {
    throw new TypeError(`${owner}: samples must be an integer of at least 2`)
  }
  return { ci, samples }
}

function regressionSamples<TDatum>(
  data: readonly TDatum[],
  independentValues: readonly (RegressionIndependentValue | null | undefined)[],
  dependentValues: readonly (number | null | undefined)[],
  rawGroups: readonly (ChartKey | null | undefined)[],
  options: { ci: number; samples: number },
  owner: 'linearRegressionX' | 'linearRegressionY',
): RegressionSample<TDatum>[] {
  const groups = rawGroups.map((group) => (isChartKey(group) ? group : null))
  const independentKind = validateIndependentKind(
    independentValues,
    dependentValues,
    owner,
  )

  return groupedIndexes(groups).flatMap(({ key: group, indexes }) => {
    const observations = indexes.flatMap((sourceIndex) => {
      const independent = numericIndependent(independentValues[sourceIndex])
      const dependent = dependentValues[sourceIndex]
      return independent !== undefined && isFiniteNumber(dependent)
        ? [{ sourceIndex, independent, dependent }]
        : []
    })
    if (observations.length < 2) return []
    const fit = fitRegression(observations, options.ci)
    if (fit === undefined) return []
    let minimum = Number.POSITIVE_INFINITY
    let maximum = Number.NEGATIVE_INFINITY
    observations.forEach(({ independent }) => {
      minimum = Math.min(minimum, independent)
      maximum = Math.max(maximum, independent)
    })
    const sourceIndexes = observations.map(({ sourceIndex }) => sourceIndex)
    const lineageSource = sourceIndexes.map((index) => data[index] as TDatum)
    const groupKey = valueKey(group)

    return Array.from({ length: options.samples }, (_value, sampleIndex) => {
      const independent =
        sampleIndex === 0
          ? minimum
          : sampleIndex === options.samples - 1
            ? maximum
            : minimum +
              ((maximum - minimum) * sampleIndex) / (options.samples - 1)
      const predicted = predictRegression(fit, independent)
      if (!Number.isFinite(predicted)) {
        throw new TypeError(`${owner}: fitted values must be finite`)
      }
      const halfWidth = confidenceHalfWidth(fit, independent)
      const lower = halfWidth === undefined ? undefined : predicted - halfWidth
      const upper = halfWidth === undefined ? undefined : predicted + halfWidth
      if (
        (lower !== undefined && !Number.isFinite(lower)) ||
        (upper !== undefined && !Number.isFinite(upper))
      ) {
        throw new TypeError(`${owner}: confidence values must be finite`)
      }
      return {
        independent:
          independentKind === 'date' ? new Date(independent) : independent,
        predicted,
        ...(lower === undefined ? {} : { lower }),
        ...(upper === undefined ? {} : { upper }),
        group,
        source: lineageSource,
        sourceIndexes,
        markKey: `${groupKey}:${sampleIndex}`,
      }
    })
  })
}

function validateIndependentKind(
  independentValues: readonly (RegressionIndependentValue | null | undefined)[],
  dependentValues: readonly (number | null | undefined)[],
  owner: 'linearRegressionX' | 'linearRegressionY',
): 'date' | 'number' {
  let kind: 'date' | 'number' | undefined
  independentValues.forEach((value, index) => {
    if (numericIndependent(value) === undefined) return
    if (!isFiniteNumber(dependentValues[index])) return
    const next = value instanceof Date ? 'date' : 'number'
    if (kind !== undefined && kind !== next) {
      throw new TypeError(
        `${owner}: independent values must be uniformly numbers or Dates`,
      )
    }
    kind = next
  })
  return kind ?? 'number'
}

function numericIndependent(value: unknown): number | undefined {
  if (isFiniteNumber(value)) return value
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime()
  }
  return undefined
}

function fitRegression(
  observations: readonly RegressionObservation[],
  ci: number,
): RegressionFit | undefined {
  let meanIndependent = 0
  let meanDependent = 0
  let sumIndependentSquares = 0
  let sumProducts = 0

  observations.forEach(({ independent, dependent }, index) => {
    const count = index + 1
    const independentDelta = independent - meanIndependent
    const dependentDelta = dependent - meanDependent
    meanIndependent += independentDelta / count
    meanDependent += dependentDelta / count
    sumIndependentSquares += independentDelta * (independent - meanIndependent)
    sumProducts += independentDelta * (dependent - meanDependent)
  })
  if (!Number.isFinite(sumIndependentSquares) || sumIndependentSquares <= 0) {
    return undefined
  }
  const slope = sumProducts / sumIndependentSquares
  if (!Number.isFinite(slope)) return undefined
  const residualDegrees = observations.length - 2
  if (ci === 0 || residualDegrees <= 0) {
    return {
      count: observations.length,
      meanIndependent,
      meanDependent,
      sumIndependentSquares,
      slope,
    }
  }
  let residualSquares = 0
  observations.forEach(({ independent, dependent }) => {
    const residual =
      dependent - (meanDependent + slope * (independent - meanIndependent))
    residualSquares += residual * residual
  })
  const residualStandardError = Math.sqrt(
    Math.max(0, residualSquares) / residualDegrees,
  )
  const criticalValue = inverseStudentT((1 + ci) / 2, residualDegrees)
  if (
    !Number.isFinite(residualStandardError) ||
    !Number.isFinite(criticalValue)
  ) {
    return undefined
  }
  return {
    count: observations.length,
    meanIndependent,
    meanDependent,
    sumIndependentSquares,
    slope,
    residualStandardError,
    criticalValue,
  }
}

function predictRegression(fit: RegressionFit, independent: number): number {
  return fit.meanDependent + fit.slope * (independent - fit.meanIndependent)
}

function confidenceHalfWidth(
  fit: RegressionFit,
  independent: number,
): number | undefined {
  if (
    fit.residualStandardError === undefined ||
    fit.criticalValue === undefined
  ) {
    return undefined
  }
  const centered = independent - fit.meanIndependent
  const standardError =
    fit.residualStandardError *
    Math.sqrt(1 / fit.count + (centered * centered) / fit.sumIndependentSquares)
  return fit.criticalValue * standardError
}

function inverseStudentT(
  probability: number,
  degreesOfFreedom: number,
): number {
  if (probability === 0.5) return 0
  const sign = probability < 0.5 ? -1 : 1
  const target = probability < 0.5 ? 1 - probability : probability
  let low = 0
  let high = 1
  while (studentTCdf(high, degreesOfFreedom) < target) high *= 2
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const middle = (low + high) / 2
    if (studentTCdf(middle, degreesOfFreedom) < target) low = middle
    else high = middle
  }
  return sign * ((low + high) / 2)
}

function studentTCdf(value: number, degreesOfFreedom: number): number {
  const ratio = degreesOfFreedom / (degreesOfFreedom + value * value)
  const tail = regularizedIncompleteBeta(ratio, degreesOfFreedom / 2, 0.5) / 2
  return value >= 0 ? 1 - tail : tail
}

function regularizedIncompleteBeta(
  value: number,
  alpha: number,
  beta: number,
): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  const factor = Math.exp(
    logGamma(alpha + beta) -
      logGamma(alpha) -
      logGamma(beta) +
      alpha * Math.log(value) +
      beta * Math.log1p(-value),
  )
  return value < (alpha + 1) / (alpha + beta + 2)
    ? (factor * betaContinuedFraction(value, alpha, beta)) / alpha
    : 1 - (factor * betaContinuedFraction(1 - value, beta, alpha)) / beta
}

function betaContinuedFraction(
  value: number,
  alpha: number,
  beta: number,
): number {
  const floor = 1e-30
  const sum = alpha + beta
  const alphaPlus = alpha + 1
  const alphaMinus = alpha - 1
  let c = 1
  let d = 1 - (sum * value) / alphaPlus
  if (Math.abs(d) < floor) d = floor
  d = 1 / d
  let result = d
  for (let iteration = 1; iteration <= 200; iteration += 1) {
    const doubled = iteration * 2
    let numerator =
      (iteration * (beta - iteration) * value) /
      ((alphaMinus + doubled) * (alpha + doubled))
    d = 1 + numerator * d
    if (Math.abs(d) < floor) d = floor
    c = 1 + numerator / c
    if (Math.abs(c) < floor) c = floor
    d = 1 / d
    result *= d * c
    numerator =
      (-(alpha + iteration) * (sum + iteration) * value) /
      ((alpha + doubled) * (alphaPlus + doubled))
    d = 1 + numerator * d
    if (Math.abs(d) < floor) d = floor
    c = 1 + numerator / c
    if (Math.abs(c) < floor) c = floor
    d = 1 / d
    const change = d * c
    result *= change
    if (Math.abs(change - 1) < 3e-12) break
  }
  return result
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ]
  if (value < 0.5) {
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value)
    )
  }
  const shifted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (shifted + index + 1)
  })
  const total = shifted + coefficients.length - 0.5
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(total) -
    total +
    Math.log(series)
  )
}
