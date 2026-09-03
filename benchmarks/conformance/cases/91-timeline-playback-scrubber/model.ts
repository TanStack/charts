import type { AaplRow } from '@tanstack/charts-data/aapl'

export const initialPlaybackIndex = 2

export function selectPlaybackRows(
  rows: readonly AaplRow[],
): readonly AaplRow[] {
  const start = Date.UTC(2018, 0, 2)
  const end = Date.UTC(2018, 0, 11)
  return rows.filter((row) => {
    const timestamp = row.Date.getTime()
    return timestamp >= start && timestamp <= end
  })
}

export function playbackDomain(
  rows: readonly AaplRow[],
): readonly [Date, Date] {
  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last) throw new Error('Playback requires observed AAPL rows.')
  return [first.Date, last.Date]
}

export function playbackDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function playbackIndexFromAnchor(
  rows: readonly AaplRow[],
  anchor: string,
) {
  const key = anchor.startsWith('frame:') ? anchor.slice(6) : ''
  const index = rows.findIndex((row) => playbackDateKey(row.Date) === key)
  return index < 0 ? null : index
}
