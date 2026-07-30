export interface GaugeBand {
  id: 'low' | 'elevated' | 'high'
  label: string
  value: number
}

export interface GaugeTick {
  id: string
  value: number
}

export const gaugeMaximum = 30

export const gaugeBands: readonly GaugeBand[] = [
  { id: 'low', label: 'Below 8%', value: 8 },
  { id: 'elevated', label: '8–15%', value: 7 },
  { id: 'high', label: 'Above 15%', value: 15 },
]

export const gaugeTicks: readonly GaugeTick[] = Array.from(
  { length: 11 },
  (_, index) => ({
    id: `tick-${index}`,
    value: index * 3,
  }),
)
