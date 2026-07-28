import { stack } from 'd3-shape'
import type { BenchmarkInput } from '../../types'

interface WideDatum {
  id: number
  x: number
  category: string
  primary: number
  secondary: number
}

export interface StackedDatum {
  id: string
  x: number
  category: string
  y1: number
  y2: number
  series: 'Series A' | 'Series B'
}

const keys = ['primary', 'secondary'] as const

export function stackedRows(input: BenchmarkInput): StackedDatum[] {
  const wide: WideDatum[] = input.rows.map((row, index) => ({
    id: row.id,
    x: row.x,
    category: row.category,
    primary: row.y,
    secondary: input.secondaryRows[index]?.y ?? 0,
  }))

  return stack<WideDatum, (typeof keys)[number]>()
    .keys(keys)(wide)
    .flatMap((series) =>
      series.map((point) => ({
        id: `${series.key}:${point.data.id}`,
        x: point.data.x,
        category: point.data.category,
        y1: point[0],
        y2: point[1],
        series: series.key === 'primary' ? 'Series A' : 'Series B',
      })),
    )
}
