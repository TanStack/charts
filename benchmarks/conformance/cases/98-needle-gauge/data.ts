export interface GaugeBand {
  id: string
  label: string
  value: number
  fill: string
}

export interface GaugeReading {
  id: string
  value: number
  label: string
}

export interface GaugeTick {
  id: string
  value: number
}

export const gaugeBands: readonly GaugeBand[] = [
  { id: 'safe', label: 'Safe', value: 55, fill: '#22c55e' },
  { id: 'watch', label: 'Watch', value: 25, fill: '#f59e0b' },
  { id: 'critical', label: 'Critical', value: 20, fill: '#ef4444' },
]

export const gaugeTicks: readonly GaugeTick[] = Array.from(
  { length: 11 },
  (_, index) => ({
    id: `tick-${index}`,
    value: index * 10,
  }),
)

export function gaugeReading(revision = 0): GaugeReading {
  const value = revision % 2 === 0 ? 68 : 86

  return {
    id: 'reading',
    value,
    label: `${value}%`,
  }
}
