import { categoryData } from '../../shared/data'

export interface DumbbellPoint {
  id: string
  category: string
  desktop: number
  mobile: number
}

export function dumbbellData(revision = 0): readonly DumbbellPoint[] {
  const rows = categoryData(revision)
  return [...new Set(rows.map((row) => row.category))].map((category) => ({
    id: category,
    category,
    desktop:
      rows.find((row) => row.category === category && row.series === 'Desktop')
        ?.value ?? 0,
    mobile:
      rows.find((row) => row.category === category && row.series === 'Mobile')
        ?.value ?? 0,
  }))
}
