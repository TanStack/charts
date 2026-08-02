import { binTimeX } from '@tanstack/charts'
import { utcDay, utcMonth, utcSunday } from 'd3-time'

export interface TokenUsageEvent {
  readonly at: Date
  readonly tokens: number
}

export const weekdays = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const

export const usageLevels = [
  'No usage',
  'Up to 25M',
  '25M–75M',
  '75M–150M',
  'Over 150M',
] as const

export type UsageLevel = (typeof usageLevels)[number]

export const usageColors = [
  '#f3f4f6',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#3b82f6',
] as const

export interface TokenUsageDay {
  readonly date: Date
  readonly dateKey: string
  readonly week: number
  readonly weekday: (typeof weekdays)[number]
  readonly tokens: number
  readonly sessions: number
  readonly level: UsageLevel
  readonly source: readonly TokenUsageEvent[]
  readonly sourceIndexes: readonly number[]
}

export const calendarStart = new Date('2025-08-03T00:00:00Z')
export const calendarEnd = new Date('2026-08-01T00:00:00Z')
export const calendarWeekCount = utcSunday.count(calendarStart, calendarEnd) + 1

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const monthFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const tokenFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function tokenUsageCalendar(revision: number): TokenUsageDay[] {
  const events = tokenUsageEvents(revision)
  const daily = binTimeX(events, {
    value: 'at',
    interval: utcDay,
    domain: [calendarStart, calendarEnd],
    outputs: {
      tokens: { value: 'tokens', reduce: 'sum' },
      sessions: { reduce: 'count' },
    },
  })

  return daily.map((day) => {
    const date = day.x1
    const dateKey = isoDate(date)
    return {
      date,
      dateKey,
      week: utcSunday.count(calendarStart, date),
      weekday: weekdays[date.getUTCDay()] ?? 'Sun',
      tokens: day.tokens,
      sessions: day.sessions,
      level: usageLevel(day.tokens),
      source: day.source,
      sourceIndexes: day.sourceIndexes,
    }
  })
}

export function tokenUsageEvents(revision: number): TokenUsageEvent[] {
  const dates = utcDay.range(calendarStart, utcDay.offset(calendarEnd, 1))
  return dates.flatMap((date, dayIndex) => {
    const weekday = date.getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const progress = dayIndex / Math.max(1, dates.length - 1)
    const activityRamp = Math.min(1, Math.max(0, (progress - 0.46) / 0.08))
    const activity = (dayIndex * 37 + weekday * 17 + revision * 11) % 100
    const quietThreshold = Math.round(99 - activityRamp * (weekend ? 67 : 81))
    if (activity < quietThreshold) return []

    const intensityRamp = Math.min(1, Math.max(0, (progress - 0.5) / 0.5))
    const surge =
      intensityRamp > 0.8 && (dayIndex * 11 + weekday * 7 + revision) % 13 === 0
        ? 90_000_000
        : 0
    const total =
      4_000_000 +
      ((dayIndex * 7_919_000 + weekday * 13_337_000 + revision * 9_973_000) %
        28_000_000) +
      Math.round(intensityRamp * 78_000_000) +
      surge
    const sessions = 1 + ((dayIndex + revision + weekday) % 3)
    return Array.from({ length: sessions }, (_value, sessionIndex) => ({
      at: new Date(date.getTime() + (8 + sessionIndex * 4) * 3_600_000),
      tokens:
        Math.floor(total / sessions) +
        (sessionIndex < total % sessions ? 1 : 0),
    }))
  })
}

export function calendarMonthTicks(): {
  readonly values: readonly number[]
  readonly labels: ReadonlyMap<number, string>
} {
  const dates = [calendarStart, ...utcMonth.range(calendarStart, calendarEnd)]
  const labels = new Map<number, string>()
  for (const date of dates) {
    const week = utcSunday.count(calendarStart, date)
    if (!labels.has(week)) labels.set(week, monthFormat.format(date))
  }
  return { values: [...labels.keys()], labels }
}

export function formatTokenUsage(day: TokenUsageDay): string {
  return `${tokenFormat.format(day.tokens)} tokens on ${dateFormat.format(day.date)}`
}

function usageLevel(tokens: number): UsageLevel {
  if (tokens === 0) return 'No usage'
  if (tokens <= 25_000_000) return 'Up to 25M'
  if (tokens <= 75_000_000) return '25M–75M'
  if (tokens <= 150_000_000) return '75M–150M'
  return 'Over 150M'
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
