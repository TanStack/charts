import { describe, expect, it } from 'vitest'
import {
  dashboardAreaRows,
  filterDashboardData,
  formatDashboardDate,
} from './data'

describe('shadcn dashboard data', () => {
  it('matches the inclusive ranges used by dashboard-01', () => {
    expect(filterDashboardData('90d')).toHaveLength(91)
    expect(filterDashboardData('30d')).toHaveLength(31)
    expect(filterDashboardData('7d')).toHaveLength(8)
    expect(filterDashboardData('7d')[0]?.date).toBe('2024-06-23')
  })

  it('folds each date into the official mobile-first stack order', () => {
    const source = filterDashboardData('7d')
    const rows = dashboardAreaRows(source)

    expect(rows).toHaveLength(source.length * 2)
    expect(rows.slice(0, 2).map((row) => row.series)).toEqual([
      'mobile',
      'desktop',
    ])
    expect(rows[0]?.visitors).toBe(source[0]?.mobile)
    expect(rows[1]?.visitors).toBe(source[0]?.desktop)
  })

  it('formats dates independently of the local timezone', () => {
    expect(formatDashboardDate(new Date('2024-06-30T00:00:00Z'))).toBe('Jun 30')
  })
})
