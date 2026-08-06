import type {
  ChartBounds,
  ChartPoint,
  ChartRollingPathMotion,
  ResolvedScale,
} from './types'

const coordinateTolerance = 0.05

export interface RollingPathSnapshot {
  kind: 'polyline' | 'area'
  points: readonly ChartPoint[]
  geometry: readonly (readonly [number, number])[]
  chart: ChartBounds
  yScale: ResolvedScale
  viewportTranslate: Readonly<{ x: number; y: number }>
  clipped: boolean
  customPath: boolean
}

export interface RollingPathTransform {
  x: number
  yScale: number
  y: number
}

export type RollingPathInvalidReason =
  | 'missing-clip'
  | 'plot-bounds-changed'
  | 'path-kind-changed'
  | 'transient-viewport'
  | 'custom-path'
  | 'missing-semantic-points'
  | 'unbalanced-batch'
  | 'unstable-keys'
  | 'noncontiguous-window'
  | 'semantic-value-changed'
  | 'nonuniform-x-shift'
  | 'fixed-y-changed'
  | 'non-affine-y'
  | 'insufficient-coverage'

export type RollingPathPlan =
  | {
      kind: 'transform'
      transform: RollingPathTransform
      batchSize: number
    }
  | {
      kind: 'fallback'
      fallback: 'snap' | 'morph'
      reason: RollingPathInvalidReason
    }

export function resolveRollingPathPlan(
  previous: RollingPathSnapshot,
  next: RollingPathSnapshot,
  options: ChartRollingPathMotion,
): RollingPathPlan {
  const invalid = (reason: RollingPathInvalidReason): RollingPathPlan => ({
    kind: 'fallback',
    fallback: options.fallback ?? 'snap',
    reason,
  })

  if (!previous.clipped || !next.clipped) return invalid('missing-clip')
  if (previous.kind !== next.kind) return invalid('path-kind-changed')
  if (
    Math.abs(previous.viewportTranslate.x) > 0.002 ||
    Math.abs(previous.viewportTranslate.y) > 0.002 ||
    Math.abs(next.viewportTranslate.x) > 0.002 ||
    Math.abs(next.viewportTranslate.y) > 0.002
  ) {
    return invalid('transient-viewport')
  }
  if (!sameBounds(previous.chart, next.chart)) {
    return invalid('plot-bounds-changed')
  }
  if (previous.customPath || next.customPath) return invalid('custom-path')

  const previousPoints = previous.points
  const nextPoints = next.points
  if (
    previousPoints.length !== nextPoints.length ||
    previousPoints.length < 3
  ) {
    return invalid('unbalanced-batch')
  }
  if (!uniquePointKeys(previousPoints) || !uniquePointKeys(nextPoints)) {
    return invalid('unstable-keys')
  }

  const batchSize = rollingBatchSize(previousPoints, nextPoints)
  if (batchSize === undefined) return invalid('noncontiguous-window')
  const retained = nextPoints.length - batchSize
  if (retained < 2) return invalid('unbalanced-batch')

  const xShifts: number[] = []
  const yPairs: Array<readonly [next: number, previous: number]> = []
  for (let index = 0; index < retained; index += 1) {
    const prior = previousPoints[index + batchSize]
    const point = nextPoints[index]
    if (!prior || !point) return invalid('unbalanced-batch')
    if (!samePointSemantics(prior, point)) {
      return invalid('semantic-value-changed')
    }
    xShifts.push(prior.x - point.x)
    yPairs.push([point.y, prior.y])
    for (const name of ['y1Value', 'y2Value'] as const) {
      const value = point[name]
      if (value === undefined) continue
      const nextY = safeMap(next.yScale, value)
      const previousY = safeMap(previous.yScale, value)
      if (nextY === undefined || previousY === undefined) {
        return invalid('non-affine-y')
      }
      yPairs.push([nextY, previousY])
    }
  }

  const x = xShifts[0] ?? 0
  if (
    Math.abs(x) <= 0.002 ||
    xShifts.some((candidate) => !close(candidate, x))
  ) {
    return invalid('nonuniform-x-shift')
  }

  const y =
    options.y === 'reproject'
      ? fitAffine(yPairs)
      : yPairs.every(([nextY, previousY]) => close(nextY, previousY))
        ? { scale: 1, translate: 0 }
        : undefined
  if (!y) {
    return invalid(
      options.y === 'reproject' ? 'non-affine-y' : 'fixed-y-changed',
    )
  }

  const xs = next.geometry.map((point) => point[0])
  const minimum = Math.min(...xs)
  const maximum = Math.max(...xs)
  const left = next.chart.x
  const right = left + next.chart.width
  const covered =
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    (x > 0
      ? minimum + x <= left + coordinateTolerance &&
        maximum >= right - coordinateTolerance
      : maximum + x >= right - coordinateTolerance &&
        minimum <= left + coordinateTolerance)
  if (!covered) return invalid('insufficient-coverage')

  return {
    kind: 'transform',
    batchSize,
    transform: { x, yScale: y.scale, y: y.translate },
  }
}

function rollingBatchSize(
  previous: readonly ChartPoint[],
  next: readonly ChartPoint[],
) {
  for (let batchSize = 1; batchSize < previous.length; batchSize += 1) {
    const retained = previous.length - batchSize
    let matches = true
    for (let index = 0; index < retained; index += 1) {
      if (previous[index + batchSize]?.key !== next[index]?.key) {
        matches = false
        break
      }
    }
    if (matches) return batchSize
  }
  return undefined
}

function samePointSemantics(previous: ChartPoint, next: ChartPoint) {
  if (
    previous.markId !== next.markId ||
    !sameValue(previous.group, next.group)
  ) {
    return false
  }
  for (const name of [
    'xValue',
    'yValue',
    'x1Value',
    'x2Value',
    'y1Value',
    'y2Value',
  ] as const) {
    if (!sameValue(previous[name], next[name])) return false
  }
  return true
}

function sameValue(previous: unknown, next: unknown) {
  if (previous instanceof Date && next instanceof Date) {
    return previous.getTime() === next.getTime()
  }
  return Object.is(previous, next)
}

function uniquePointKeys(points: readonly ChartPoint[]) {
  return new Set(points.map((point) => point.key)).size === points.length
}

function safeMap(scale: ResolvedScale, value: unknown) {
  try {
    const mapped = scale.map(value)
    return Number.isFinite(mapped) ? mapped : undefined
  } catch {
    return undefined
  }
}

function fitAffine(pairs: readonly (readonly [number, number])[]) {
  const first = pairs[0]
  if (!first) return undefined
  let second: readonly [number, number] | undefined
  for (const pair of pairs) {
    if (Math.abs(pair[0] - first[0]) > coordinateTolerance) {
      second = pair
      break
    }
  }
  const scale = second ? (second[1] - first[1]) / (second[0] - first[0]) : 1
  const translate = first[1] - scale * first[0]
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(translate)) {
    return undefined
  }
  return pairs.every(([next, previous]) =>
    close(scale * next + translate, previous),
  )
    ? { scale, translate }
    : undefined
}

function sameBounds(previous: ChartBounds, next: ChartBounds) {
  return (
    close(previous.x, next.x) &&
    close(previous.y, next.y) &&
    close(previous.width, next.width) &&
    close(previous.height, next.height)
  )
}

function close(left: number, right: number) {
  return Math.abs(left - right) <= coordinateTolerance
}
