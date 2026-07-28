export interface CalendarPoint {
  id: string
  date: Date
  count: number
}

export const calendarStart = new Date(Date.UTC(2026, 0, 4))

export function calendarData(revision = 0): readonly CalendarPoint[] {
  return Array.from({ length: 98 }, (_, index) => ({
    id: `day:${index}`,
    date: new Date(calendarStart.getTime() + index * 86_400_000),
    count:
      4 +
      ((index * 17 +
        Math.floor(index / 7) * 11 +
        (index % 7) * 5 +
        revision * 7) %
        76),
  }))
}
