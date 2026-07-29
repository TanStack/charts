export const radarMetrics = [
  'Reliability',
  'Speed',
  'Coverage',
  'Quality',
  'Efficiency',
  'Growth',
] as const

export type RadarMetric = (typeof radarMetrics)[number]
export type RadarSeries = 'Current' | 'Target'

export interface ComparativeRadarDatum {
  metric: RadarMetric
  current: number
  target: number
}

export interface ComparativeRadarPoint {
  metric: RadarMetric
  value: number
  series: RadarSeries
}

const initialData: readonly ComparativeRadarDatum[] = [
  { metric: 'Reliability', current: 82, target: 94 },
  { metric: 'Speed', current: 76, target: 88 },
  { metric: 'Coverage', current: 68, target: 85 },
  { metric: 'Quality', current: 88, target: 92 },
  { metric: 'Efficiency', current: 72, target: 86 },
  { metric: 'Growth', current: 79, target: 90 },
]

export function comparativeRadarData(
  revision = 0,
): readonly ComparativeRadarDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) =>
    row.metric === 'Coverage'
      ? { ...row, current: 77 }
      : row.metric === 'Efficiency'
        ? { ...row, current: 81 }
        : row,
  )
}

export function comparativeRadarPoints(
  revision = 0,
): readonly ComparativeRadarPoint[] {
  return comparativeRadarData(revision).flatMap((row) => [
    { metric: row.metric, value: row.current, series: 'Current' },
    { metric: row.metric, value: row.target, series: 'Target' },
  ])
}
