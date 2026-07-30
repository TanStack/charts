import { describe, expect, it } from 'vitest'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { selectRepresentativeDecathletes } from './selection'
import { normalizeDecathlonResults } from './transform'

describe('normalizeDecathlonResults', () => {
  it('keeps one four-event profile per selected country', () => {
    const representativeDecathletes = selectRepresentativeDecathletes(decathlon)
    const rows = normalizeDecathlonResults(decathlon, representativeDecathletes)

    expect(rows).toHaveLength(representativeDecathletes.length * 4)
    expect(new Set(rows.map((row) => row.Country)).size).toBe(
      representativeDecathletes.length,
    )
    expect(
      rows.every(
        (row) => row.relativePerformance >= 0 && row.relativePerformance <= 100,
      ),
    ).toBe(true)
  })
})
