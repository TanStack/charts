import { isChartValue } from './mark'
import type { ResolvedScale } from './types'

/** Smallest positive distance between distinct mapped semantic values. */
export function minimumMappedSpacing(
  scale: ResolvedScale,
  values: readonly unknown[],
): number | undefined {
  const positions = [
    ...new Set(
      values
        .filter(isChartValue)
        .map(scale.map)
        .filter((value) => Number.isFinite(value)),
    ),
  ].sort((left, right) => left - right)
  let minimum = Infinity
  for (let index = 1; index < positions.length; index += 1) {
    const distance = positions[index]! - positions[index - 1]!
    if (distance > 0) minimum = Math.min(minimum, distance)
  }
  return Number.isFinite(minimum) ? minimum : undefined
}

/** Category step from the complete scale domain, with a bounded singleton fallback. */
export function resolvedCategoryStep(
  scale: ResolvedScale,
  plotSpan: number,
  fitUnits = 1,
): number {
  const spacing = minimumMappedSpacing(scale, scale.domain)
  if (spacing !== undefined) return spacing
  const fitted = plotSpan / Math.max(1, fitUnits)
  return scale.bandwidth > 0 ? Math.min(scale.bandwidth, fitted) : fitted
}

export function isResolvedCategoryScale(scale: ResolvedScale | undefined) {
  return scale?.type === 'band' || scale?.type === 'point'
}
