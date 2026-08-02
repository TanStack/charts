export interface FocusMotionRow {
  id: string
  period: string
  series: string
  value: number
}

export const focusMotionPeriods = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const

export const focusMotionSeries = ['Alpha', 'Beta', 'Gamma'] as const

const values = {
  Alpha: [46, 62, 55, 78, 69, 84, 74],
  Beta: [72, 58, 67, 52, 64, 48, 57],
  Gamma: [31, 44, 39, 56, 47, 61, 68],
} as const

export const focusMotionRows: readonly FocusMotionRow[] =
  focusMotionSeries.flatMap((series) =>
    focusMotionPeriods.map((period, index) => ({
      id: `${series}:${period}`,
      period,
      series,
      value: values[series][index] ?? 0,
    })),
  )
