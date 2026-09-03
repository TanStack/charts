import { describe, expect, it } from 'vitest'
import { downloads } from '@tanstack/charts-data/downloads'
import {
  streamingStatus,
  streamingViewportForMode,
  visibleStreamingData,
} from './model'
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

  it('derives locked, latest, and complete viewports from one policy helper', () => {
    const rows = streamingData(downloads, 0, 1)

    expect(dateKeys(streamingViewportForMode(rows, 'locked'))).toEqual([
      '2018-10-05',
      '2018-10-12',
    ])
    expect(dateKeys(streamingViewportForMode(rows, 'latest'))).toEqual([
      '2018-10-06',
      '2018-10-13',
    ])
    expect(dateKeys(streamingViewportForMode(rows, 'all'))).toEqual([
      '2018-10-01',
      '2018-10-13',
    ])
  })

  it('keeps viewport filtering and status copy shared across both renderers', () => {
    const rows = streamingData(downloads, 0, 1)
    const viewport = streamingViewportForMode(rows, 'latest')

    expect(visibleStreamingData(rows, viewport)).toHaveLength(8)
    expect(
      streamingStatus({ rows, viewport, viewportMode: 'latest' }),
    ).toContain('Following latest')
    expect(
      streamingStatus({
        rows,
        viewport,
        viewportMode: 'latest',
        announcement: 'Added one visible sample.',
      }),
    ).toBe('Added one visible sample.')
  })
})

function dateKeys(domain: readonly [Date, Date]) {
  return domain.map((date) => date.toISOString().slice(0, 10))
}
