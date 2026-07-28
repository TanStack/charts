export interface StreamingDatum {
  id: string
  date: Date
  value: number
}

const start = Date.UTC(2025, 0, 1)
const day = 86_400_000
const initialValues = [24, 28, 27, 33, 36, 39, 37, 44, 48, 46, 52, 55]

export const streamingViewportDomain: readonly [Date, Date] = [
  dateAt(4),
  dateAt(11),
]

export function streamingData(
  revision = 0,
  appended = 0,
): readonly StreamingDatum[] {
  const count = initialValues.length + appended
  return Array.from({ length: count }, (_, index) => {
    const initial =
      initialValues[index] ??
      56 + (index - initialValues.length) * 4 + ((index * 3) % 5)
    const value =
      revision % 2 === 1 && index === 7
        ? initial + 5
        : revision % 2 === 1 && index === 10
          ? initial - 3
          : initial
    return {
      id: `sample-${index}`,
      date: dateAt(index),
      value,
    }
  })
}

export function visibleStreamingData(
  rows: readonly StreamingDatum[],
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

function dateAt(index: number) {
  return new Date(start + index * day)
}
