export interface RadarDatum {
  month: string
  desktop: number
  mobile: number
}

export interface RadarPoint {
  month: string
  series: 'desktop' | 'mobile'
  visitors: number
}

export const radarData: readonly RadarDatum[] = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 },
]

export const radarMonths = radarData.map((row) => row.month)
export const radarSeries = ['desktop', 'mobile'] as const
export const radarColors = [
  'var(--chart-1, var(--ts-chart-1))',
  'var(--chart-2, var(--ts-chart-2))',
] as const
export const radarPoints: readonly RadarPoint[] = radarData.flatMap((row) => [
  { month: row.month, series: 'desktop', visitors: row.desktop },
  { month: row.month, series: 'mobile', visitors: row.mobile },
])
