export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function finiteNumber(
  value: number | undefined,
  fallback: number,
): number {
  return isFiniteNumber(value) ? value : fallback
}

export function finitePositive(
  value: number | undefined,
  fallback: number,
): number {
  return isFiniteNumber(value) && value > 0 ? value : fallback
}

export function finiteNonNegative(
  value: number | undefined,
  fallback: number,
): number {
  return isFiniteNumber(value) && value >= 0 ? value : fallback
}

export function clampNonnegativeNumber(
  value: number | undefined,
  fallback = 0,
): number {
  return isFiniteNumber(value) ? Math.max(0, value) : fallback
}
