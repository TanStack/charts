export interface ExtremumPoint {
  id: string
  date: Date
  value: number
}

const start = Date.UTC(2025, 0, 5)
const week = 7 * 24 * 60 * 60 * 1000
const values = [
  48, 52, 46, 60, 55, 65, 72, 68, 75, 63, 58, 54, 49, 44, 38, 33, 29, 36, 42,
  50, 61, 70, 79, 74,
]

export const extremumDateDomain: readonly [Date, Date] = [
  new Date(start),
  new Date(start + (values.length - 1) * week),
]

export const extremumValueDomain: readonly [number, number] = [20, 90]

export function extremumData(revision = 0): readonly ExtremumPoint[] {
  const updated = revision % 2 === 1

  return values.map((value, index) => ({
    id: `week:${index}`,
    date: new Date(start + index * week),
    value: updated && index === 6 ? 85 : updated && index === 12 ? 25 : value,
  }))
}
