export function quantileSortedValues(
  values: readonly number[],
  probability: number,
): number {
  if (!values.length) return Number.NaN
  const position = (values.length - 1) * probability
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const start = values[lower] as number
  const end = values[upper] as number
  return start + (end - start) * (position - lower)
}
