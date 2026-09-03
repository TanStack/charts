export interface ProportionalInterval {
  readonly fraction: number
  readonly start: number
  readonly end: number
}

export interface ProportionalIntervalOptions {
  /** Start of the allocation extent. Defaults to zero. */
  readonly start?: number
  /** End of the allocation extent. Defaults to one. */
  readonly end?: number
  /** Empty extent between positive intervals. Defaults to zero. */
  readonly gap?: number
  /** Reserve one additional gap after the final positive interval. */
  readonly gapAfterLast?: boolean
}

/** Allocates ordered nonnegative weights into aligned proportional intervals. */
export function allocateProportionalIntervals(
  weights: readonly number[],
  options: Readonly<ProportionalIntervalOptions> = {},
): ProportionalInterval[] {
  const start = options.start ?? 0
  const end = options.end ?? 1
  const gap = options.gap ?? 0

  assertFinite(start, 'start')
  assertFinite(end, 'end')
  assertNonnegativeFinite(gap, 'gap')

  const span = end - start
  if (!Number.isFinite(span)) {
    throw new TypeError('proportional intervals: extent span must be finite')
  }

  let positiveCount = 0
  let unscaledTotal = 0
  let maximum = 0
  weights.forEach((weight, index) => {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(
        `proportional intervals: weight at index ${index} must be nonnegative and finite`,
      )
    }
    if (weight > 0) positiveCount += 1
    unscaledTotal += weight
    maximum = Math.max(maximum, weight)
  })

  const valueScale = Number.isFinite(unscaledTotal) ? 1 : maximum
  const total =
    valueScale === 1
      ? unscaledTotal
      : weights.reduce((sum, weight) => sum + weight / valueScale, 0)
  const absoluteSpan = Math.abs(span)
  const gapCount =
    positiveCount === 0
      ? 0
      : Math.max(0, positiveCount - 1) + (options.gapAfterLast === true ? 1 : 0)
  const totalGap = gapCount * gap

  if (!Number.isFinite(totalGap) || totalGap > absoluteSpan) {
    throw new TypeError(
      'proportional intervals: gap leaves insufficient extent',
    )
  }

  const drawableSpan = absoluteSpan - totalGap
  if (positiveCount > 0 && drawableSpan <= 0) {
    throw new TypeError(
      'proportional intervals: positive weights require drawable extent',
    )
  }

  const direction = span < 0 ? -1 : 1
  const intervals: ProportionalInterval[] = []
  let cursor = start
  let remainingPositive = positiveCount

  for (const weight of weights) {
    const fraction = total === 0 ? 0 : weight / valueScale / total
    const intervalStart = cursor
    let intervalEnd = cursor

    if (weight > 0) {
      remainingPositive -= 1
      intervalEnd =
        remainingPositive === 0
          ? end - (options.gapAfterLast === true ? direction * gap : 0)
          : cursor + direction * drawableSpan * fraction
      cursor = intervalEnd
      if (remainingPositive > 0 || options.gapAfterLast === true) {
        cursor += direction * gap
      }
    }

    intervals.push({ fraction, start: intervalStart, end: intervalEnd })
  }

  return intervals
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`proportional intervals: ${name} must be finite`)
  }
}

function assertNonnegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `proportional intervals: ${name} must be nonnegative and finite`,
    )
  }
}
