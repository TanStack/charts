import { describe, expect, it } from 'vitest'
import { travelers } from '@charts-poc/demo-data/travelers'
import { selectSynchronizedCursorData } from './selection'

describe('synchronized traveler cursors', () => {
  it('advances one real source row while preserving the overlap', () => {
    const initial = selectSynchronizedCursorData(travelers)
    const revised = selectSynchronizedCursorData(travelers, 1)
    const overlap = initial.filter((row) => revised.includes(row))

    expect(initial).toHaveLength(8)
    expect(revised).toHaveLength(8)
    expect(overlap).toHaveLength(7)
    for (const row of [...initial, ...revised]) {
      expect(travelers).toContain(row)
    }
  })
})
