import { describe, expect, it } from 'vitest'
import { premiumKpisForRevision } from './model'

describe('premium KPI model', () => {
  it('keeps datum identities stable while values update', () => {
    const first = premiumKpisForRevision(0)
    const next = premiumKpisForRevision(1)

    expect(first.map((metric) => metric.id)).toEqual([
      'revenue',
      'customers',
      'churn',
    ])
    expect(first.map((metric) => metric.rows.map((row) => row.id))).toEqual(
      next.map((metric) => metric.rows.map((row) => row.id)),
    )
    expect(
      first.map((metric) => metric.rows.map((row) => row.value)),
    ).not.toEqual(next.map((metric) => metric.rows.map((row) => row.value)))
  })

  it('derives the compact card values from the current revision', () => {
    expect(premiumKpisForRevision(0).map((metric) => metric.value)).toEqual([
      '$412.8K',
      '3,842',
      '1.7%',
    ])
    expect(premiumKpisForRevision(1).map((metric) => metric.value)).toEqual([
      '$429.2K',
      '3,976',
      '1.6%',
    ])
  })
})
