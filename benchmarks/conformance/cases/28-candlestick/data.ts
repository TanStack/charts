export interface CandlePoint {
  id: string
  date: Date
  open: number
  high: number
  low: number
  close: number
}

export const candleDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2025, 0, 1)),
  new Date(Date.UTC(2025, 1, 12)),
]

export function candleData(revision = 0): readonly CandlePoint[] {
  let previous = 102 + revision
  return Array.from({ length: 30 }, (_, index) => {
    const open = previous + Math.sin(index * 0.91 + revision) * 2.2
    const close = open + Math.cos(index * 1.37 + revision * 0.5) * 4.8
    const high = Math.max(open, close) + 1.5 + (index % 4) * 0.45
    const low = Math.min(open, close) - 1.2 - (index % 3) * 0.55
    previous = close
    return {
      id: `day:${index}`,
      date: new Date(Date.UTC(2025, 0, 2 + index)),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    }
  })
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
