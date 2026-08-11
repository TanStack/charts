export const themedAreaRanges = ['7d', '30d', '90d'] as const

export type ThemedAreaRange = (typeof themedAreaRanges)[number]

export interface ThemedAreaRow {
  id: string
  date: Date
  visitors: number
}

export const themedAreaRangeDays: Record<ThemedAreaRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const lastDay = Date.UTC(2026, 5, 30)
const day = 24 * 60 * 60 * 1_000

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const tooltipDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function themedAreaRows(
  range: ThemedAreaRange,
  revision = 0,
): readonly ThemedAreaRow[] {
  const rows = Array.from({ length: 90 }, (_value, index) => {
    const date = new Date(lastDay - (89 - index) * day)
    const weekly = Math.sin((index / 7) * Math.PI * 2) * 34
    const season = Math.sin(((index + 5) / 29) * Math.PI * 2) * 72
    const trend = index * 0.82
    const campaigns =
      pulse(index, 20, 4.5, 92) +
      pulse(index, 51, 6, 126) +
      pulse(index, 77, 3.8, 108)
    const revisionShift =
      Math.sin(((index + revision * 3) / 11) * Math.PI * 2) *
      Math.min(26, Math.abs(revision) * 6)
    const visitors = Math.max(
      96,
      Math.round(238 + weekly + season + trend + campaigns + revisionShift),
    )

    return {
      id: date.toISOString().slice(0, 10),
      date,
      visitors,
    }
  })

  return rows.slice(-themedAreaRangeDays[range])
}

export function formatThemedAreaTick(date: Date) {
  return dateFormatter.format(date)
}

export function formatThemedAreaTooltip(row: ThemedAreaRow) {
  return `${tooltipDateFormatter.format(row.date)} · ${row.visitors.toLocaleString('en-US')} visitors`
}

function pulse(index: number, center: number, width: number, height: number) {
  const distance = (index - center) / width
  return Math.exp(-(distance * distance)) * height
}
