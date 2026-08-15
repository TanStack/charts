import type { DownloadsRow } from '@tanstack/charts-data/downloads'

export type StreamingViewportMode = 'locked' | 'latest' | 'all'

export const streamingViewportDomain: readonly [Date, Date] = [
  new Date('2018-10-05T00:00:00.000Z'),
  new Date('2018-10-12T00:00:00.000Z'),
]

const streamingViewportSpan =
  streamingViewportDomain[1].getTime() - streamingViewportDomain[0].getTime()

export function visibleStreamingData(
  rows: readonly DownloadsRow[],
  domain: readonly [Date, Date] = streamingViewportDomain,
) {
  const startTime = domain[0].getTime()
  const endTime = domain[1].getTime()
  return rows.filter((row) => {
    const time = row.date.getTime()
    return time >= startTime && time <= endTime
  })
}

export function streamingDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function latestStreamingViewport(
  rows: readonly DownloadsRow[],
): readonly [Date, Date] {
  const end = rows.at(-1)?.date ?? streamingViewportDomain[1]
  return [new Date(end.getTime() - streamingViewportSpan), end]
}

export function fullStreamingViewport(
  rows: readonly DownloadsRow[],
): readonly [Date, Date] {
  return [
    rows[0]?.date ?? streamingViewportDomain[0],
    rows.at(-1)?.date ?? streamingViewportDomain[1],
  ]
}

export function streamingViewportForMode(
  rows: readonly DownloadsRow[],
  mode: StreamingViewportMode,
): readonly [Date, Date] {
  switch (mode) {
    case 'latest':
      return latestStreamingViewport(rows)
    case 'all':
      return fullStreamingViewport(rows)
    default:
      return streamingViewportDomain
  }
}

export function streamingViewportLabel(mode: StreamingViewportMode) {
  switch (mode) {
    case 'latest':
      return 'Following latest'
    case 'all':
      return 'All samples'
    default:
      return 'Locked viewport'
  }
}

export function streamingStatus(state: {
  rows: readonly DownloadsRow[]
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
  announcement?: string
}) {
  if (state.announcement) return state.announcement
  return `${state.rows.length} samples · ${formatStreamingDate(
    state.viewport[0],
  )}–${formatStreamingDate(state.viewport[1])} · ${streamingViewportLabel(
    state.viewportMode,
  )}`
}

export function formatStreamingDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
