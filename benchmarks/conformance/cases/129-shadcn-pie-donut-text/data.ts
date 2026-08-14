export interface BrowserDatum {
  browser: string
  visitors: number
}

export interface CenterLabel {
  id: string
  angle: number
  radius: number
  text: string
}

export const browserData: readonly BrowserDatum[] = [
  { browser: 'chrome', visitors: 275 },
  { browser: 'safari', visitors: 200 },
  { browser: 'firefox', visitors: 287 },
  { browser: 'edge', visitors: 173 },
  { browser: 'other', visitors: 190 },
]

export const browserColors = [
  'var(--chart-1, var(--ts-chart-1))',
  'var(--chart-2, var(--ts-chart-2))',
  'var(--chart-3, var(--ts-chart-3))',
  'var(--chart-4, var(--ts-chart-4))',
  'var(--chart-5, var(--ts-chart-5))',
]

export const totalVisitors = browserData.reduce(
  (sum, row) => sum + row.visitors,
  0,
)

export const centerLabels: readonly CenterLabel[] = [
  {
    id: 'total',
    angle: 0,
    radius: 0,
    text: totalVisitors.toLocaleString('en-US'),
  },
  { id: 'label', angle: 0, radius: 0, text: 'Visitors' },
]
