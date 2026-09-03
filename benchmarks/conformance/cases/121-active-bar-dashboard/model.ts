export type DashboardMetric = 'desktop' | 'mobile'

export interface DashboardRow {
  id: string
  day: string
  desktop: number
  mobile: number
}

const baseRows: readonly DashboardRow[] = [
  { id: '01', day: 'May 1', desktop: 186, mobile: 80 },
  { id: '02', day: 'May 2', desktop: 305, mobile: 200 },
  { id: '03', day: 'May 3', desktop: 237, mobile: 120 },
  { id: '04', day: 'May 4', desktop: 73, mobile: 190 },
  { id: '05', day: 'May 5', desktop: 209, mobile: 130 },
  { id: '06', day: 'May 6', desktop: 214, mobile: 140 },
  { id: '07', day: 'May 7', desktop: 318, mobile: 240 },
  { id: '08', day: 'May 8', desktop: 138, mobile: 92 },
  { id: '09', day: 'May 9', desktop: 281, mobile: 176 },
  { id: '10', day: 'May 10', desktop: 172, mobile: 126 },
  { id: '11', day: 'May 11', desktop: 352, mobile: 258 },
  { id: '12', day: 'May 12', desktop: 197, mobile: 148 },
  { id: '13', day: 'May 13', desktop: 264, mobile: 189 },
  { id: '14', day: 'May 14', desktop: 154, mobile: 118 },
  { id: '15', day: 'May 15', desktop: 329, mobile: 231 },
  { id: '16', day: 'May 16', desktop: 218, mobile: 155 },
  { id: '17', day: 'May 17', desktop: 371, mobile: 274 },
  { id: '18', day: 'May 18', desktop: 247, mobile: 181 },
  { id: '19', day: 'May 19', desktop: 291, mobile: 205 },
  { id: '20', day: 'May 20', desktop: 168, mobile: 122 },
  { id: '21', day: 'May 21', desktop: 336, mobile: 246 },
  { id: '22', day: 'May 22', desktop: 228, mobile: 164 },
  { id: '23', day: 'May 23', desktop: 389, mobile: 287 },
  { id: '24', day: 'May 24', desktop: 259, mobile: 194 },
]

export function dashboardRows(revision: number): readonly DashboardRow[] {
  if (revision % 2 === 0) return baseRows
  return baseRows.map((row, index) => ({
    ...row,
    desktop: Math.round(row.desktop * (0.9 + ((index * 7) % 9) / 50)),
    mobile: Math.round(row.mobile * (0.92 + ((index * 5) % 7) / 45)),
  }))
}

export function metricTotal(
  rows: readonly DashboardRow[],
  metric: DashboardMetric,
) {
  return rows.reduce((total, row) => total + row[metric], 0)
}
