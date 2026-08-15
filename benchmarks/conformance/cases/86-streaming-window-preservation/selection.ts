import type { DownloadsRow } from '@tanstack/charts-data/downloads'

const streamingStart = Date.parse('2018-10-01T00:00:00.000Z')
const streamingEnd = Date.parse('2018-10-31T00:00:00.000Z')

export function streamingData(
  sourceRows: readonly DownloadsRow[],
  revision = 0,
  appended = 0,
): readonly DownloadsRow[] {
  const streamingRows = sourceRows.filter(
    (row) =>
      row.date.getTime() >= streamingStart &&
      row.date.getTime() <= streamingEnd,
  )
  const advanced = Math.abs(Math.trunc(revision)) % 2
  return streamingRows.slice(advanced, advanced + 12 + appended)
}
