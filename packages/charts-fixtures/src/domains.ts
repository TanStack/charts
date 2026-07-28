import { extent } from 'd3-array'

const DAY_MS = 86_400_000

export function dateExtent<TDatum>(
  data: Iterable<TDatum>,
  value: (datum: TDatum) => Date,
): [Date, Date] {
  const [minimum, maximum] = extent(data, value)
  if (!minimum || !maximum) {
    return [new Date(0), new Date(DAY_MS)]
  }
  if (minimum.getTime() === maximum.getTime()) {
    return [minimum, new Date(minimum.getTime() + DAY_MS)]
  }
  return [minimum, maximum]
}

export function numberExtent<TDatum>(
  data: Iterable<TDatum>,
  value: (datum: TDatum) => number,
): [number, number] {
  const [minimum, maximum] = extent(data, (datum) => {
    const number = value(datum)
    return Number.isFinite(number) ? number : undefined
  })
  if (minimum === undefined || maximum === undefined) return [0, 1]
  if (minimum === maximum) {
    const offset = Math.abs(minimum) * 0.05 || 1
    return [minimum - offset, maximum + offset]
  }
  return [minimum, maximum]
}

export function zeroExtent(values: Iterable<number>): [number, number] {
  const [minimum, maximum] = numberExtent(values, (value) => value)
  return [Math.min(0, minimum), Math.max(0, maximum)]
}
