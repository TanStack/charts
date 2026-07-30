import type { AaplRow } from '@charts-poc/demo-data/aapl'

const sessionsPerView = 30

export function selectCandleData(rows: readonly AaplRow[], revision = 0) {
  const start = Math.abs(revision % 2) * sessionsPerView
  return rows.slice(start, start + sessionsPerView)
}
