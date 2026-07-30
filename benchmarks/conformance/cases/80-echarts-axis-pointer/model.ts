import { axisPointerDates, axisPointerIndustries } from './selection'
import type { AxisPointerDatum } from './selection'

export function axisPointerDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function axisPointerRowsAtDate(
  rows: readonly AxisPointerDatum[],
  date: Date,
) {
  const timestamp = date.getTime()
  return axisPointerIndustries.flatMap((industry) => {
    const row = rows.find(
      (candidate) =>
        candidate.industry === industry &&
        candidate.date.getTime() === timestamp,
    )
    return row ? [row] : []
  })
}

export function axisPointerTargetValue(rows: readonly AxisPointerDatum[]) {
  if (!rows.length) return null
  return rows.reduce((sum, row) => sum + row.unemployed, 0) / rows.length
}

export function axisPointerAnchorDate(
  anchor: string,
  rows: readonly AxisPointerDatum[],
) {
  const key = anchor.startsWith('date:') ? anchor.slice(5) : ''
  return (
    axisPointerDates(rows).find((date) => axisPointerDateKey(date) === key) ??
    null
  )
}
