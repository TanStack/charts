import { categoryData } from '../../shared/data'

export interface ErrorPoint {
  id: string
  category: string
  mean: number
  low: number
  high: number
}

export function errorData(revision = 0): readonly ErrorPoint[] {
  const groups = new Map<string, number[]>()
  for (const row of categoryData(revision)) {
    const values = groups.get(row.category)
    if (values) values.push(row.value)
    else groups.set(row.category, [row.value])
  }
  return [...groups].map(([category, values]) => {
    const mean =
      values.reduce((total, value) => total + value, 0) / values.length
    const spread = Math.max(...values) - Math.min(...values)
    return {
      id: category,
      category,
      mean,
      low: Math.max(0, mean - spread * 0.55),
      high: Math.min(70, mean + spread * 0.55),
    }
  })
}
