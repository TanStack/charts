import type { DownloadsRow } from '@charts-poc/demo-data/downloads'

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

export function formatStreamingDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
