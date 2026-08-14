export interface ActivityDay {
  date: string
  running: number
  swimming: number
}

export interface ActivityPoint {
  date: string
  activity: 'running' | 'swimming'
  calories: number
}

export const activityData: readonly ActivityDay[] = [
  { date: '2024-07-15', running: 450, swimming: 300 },
  { date: '2024-07-16', running: 380, swimming: 420 },
  { date: '2024-07-17', running: 520, swimming: 120 },
  { date: '2024-07-18', running: 140, swimming: 550 },
  { date: '2024-07-19', running: 600, swimming: 350 },
  { date: '2024-07-20', running: 480, swimming: 400 },
]

export const activities = ['running', 'swimming'] as const
export const activityColors = [
  'var(--chart-1, var(--ts-chart-1))',
  'var(--chart-2, var(--ts-chart-2))',
] as const
export const activityPoints: readonly ActivityPoint[] = activityData.flatMap(
  (row) => [
    { date: row.date, activity: 'running', calories: row.running },
    { date: row.date, activity: 'swimming', calories: row.swimming },
  ],
)
export const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
