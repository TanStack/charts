export interface DifferencePoint {
  id: string
  date: Date
  actual: number
  forecast: number
}

const actual = [20, 35, 38, 42, 25, 27, 30, 52, 48] as const
const forecast = [28, 25, 30, 30, 35, 36, 42, 40, 45] as const
const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const differenceDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2024, 0, 1)),
  new Date(Date.UTC(2024, 8, 1)),
]

export function differenceData(revision = 0): readonly DifferencePoint[] {
  return actual.map((value, index) => ({
    id: `month-${index}`,
    date: new Date(Date.UTC(2024, index, 1)),
    actual: value + (index % 2 === 0 ? revision : -revision),
    forecast: (forecast[index] ?? 0) + (index % 3 === 0 ? revision : 0),
  }))
}

export function formatDifferenceMonth(value: Date): string {
  return monthLabels[value.getUTCMonth()] ?? ''
}
