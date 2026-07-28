export interface PlaybackDatum {
  id: string
  date: Date
  value: number
}

const start = Date.UTC(2025, 0, 1)
const week = 7 * 86_400_000
const values: readonly number[] = [34, 42, 39, 51, 57, 54, 66, 72]

export const playbackDates: readonly Date[] = values.map(
  (_, index) => new Date(start + index * week),
)

export const playbackDomain: readonly [Date, Date] = [
  playbackDates[0] ?? new Date(start),
  playbackDates[playbackDates.length - 1] ?? new Date(start),
]

export const initialPlaybackIndex = 2

export function playbackData(revision = 0): readonly PlaybackDatum[] {
  return playbackDates.map((date, index) => {
    const value = values[index] ?? 0
    return {
      id: playbackDateKey(date),
      date,
      value:
        revision % 2 === 1 && (index === 3 || index === 4) ? value + 4 : value,
    }
  })
}

export function playbackDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function playbackIndexFromAnchor(anchor: string) {
  const key = anchor.startsWith('frame:') ? anchor.slice(6) : ''
  const index = playbackDates.findIndex((date) => playbackDateKey(date) === key)
  return index < 0 ? null : index
}
