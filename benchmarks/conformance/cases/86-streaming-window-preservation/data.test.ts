import { describe, expect, it } from 'vitest'
import { downloads } from '@charts-poc/demo-data/downloads'
import { streamingData } from './selection'

describe('streaming package downloads', () => {
  it('advances through source rows without changing prior measurements', () => {
    const initial = streamingData(downloads)
    const revised = streamingData(downloads, 1, 1)

    expect(initial).toHaveLength(12)
    expect(revised).toHaveLength(13)
    expect(revised.slice(0, initial.length - 1)).toEqual(initial.slice(1))
    for (const row of revised) {
      expect(downloads).toContain(row)
    }
  })
})
