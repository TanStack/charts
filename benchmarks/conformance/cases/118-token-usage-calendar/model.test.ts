import { describe, expect, it } from 'vitest'
import {
  calendarMonthTicks,
  formatTokenUsage,
  tokenUsageCalendar,
  tokenUsageEvents,
} from './model'

describe('token use calendar heatmap', () => {
  it('uses the UTC daily transform to materialize a complete twelve-month domain', () => {
    const days = tokenUsageCalendar(0)

    expect(days).toHaveLength(364)
    expect(days[0]).toMatchObject({
      dateKey: '2025-08-03',
      week: 0,
      weekday: 'Sun',
    })
    expect(days.at(-1)).toMatchObject({
      dateKey: '2026-08-01',
      week: 51,
      weekday: 'Sat',
    })
    expect(days.some((day) => day.level === 'No usage')).toBe(true)
  })

  it('preserves transform lineage and sums every raw event into its day', () => {
    const events = tokenUsageEvents(2)
    const days = tokenUsageCalendar(2)

    expect(days.flatMap((day) => day.sourceIndexes)).toHaveLength(events.length)
    for (const day of days) {
      expect(day.tokens).toBe(
        day.source.reduce((total, event) => total + event.tokens, 0),
      )
      expect(day.sessions).toBe(day.source.length)
    }
  })

  it('keeps deterministic data and stable month-label positions', () => {
    expect(tokenUsageCalendar(3)).toEqual(tokenUsageCalendar(3))
    const monthTicks = calendarMonthTicks()
    expect(monthTicks.values).toHaveLength(12)
    expect([...monthTicks.labels.values()]).toEqual([
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
    ])
  })

  it('concentrates active and intense days toward the recent end', () => {
    const days = tokenUsageCalendar(0)
    const midpoint = Math.floor(days.length / 2)
    const earlier = days.slice(0, midpoint)
    const recent = days.slice(midpoint)

    expect(recent.filter((day) => day.tokens > 0).length).toBeGreaterThan(
      earlier.filter((day) => day.tokens > 0).length * 5,
    )
    expect(recent.some((day) => day.tokens > 150_000_000)).toBe(true)
    expect(days.some((day) => day.level === 'No usage')).toBe(true)
  })

  it('formats a compact, single-line tooltip without diagnostic details', () => {
    const day = tokenUsageCalendar(0)[0]!

    expect(
      formatTokenUsage({
        ...day,
        date: new Date('2026-03-26T00:00:00Z'),
        tokens: 185_200_000,
      }),
    ).toBe('185.2M tokens on Mar 26')
    expect(
      formatTokenUsage({
        ...day,
        date: new Date('2026-03-27T00:00:00Z'),
        tokens: 0,
      }),
    ).toBe('0 tokens on Mar 27')
  })
})
