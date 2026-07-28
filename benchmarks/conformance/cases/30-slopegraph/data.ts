import { categoryData } from '../../shared/data'

export interface SlopePoint {
  id: string
  category: string
  period: 'Before' | 'After'
  value: number
}

export function slopeData(revision = 0): readonly SlopePoint[] {
  const rows = categoryData(revision)
  return [...new Set(rows.map((row) => row.category))].flatMap((category) => {
    const desktop =
      rows.find((row) => row.category === category && row.series === 'Desktop')
        ?.value ?? 0
    const mobile =
      rows.find((row) => row.category === category && row.series === 'Mobile')
        ?.value ?? 0
    return [
      {
        id: `${category}:before`,
        category,
        period: 'Before' as const,
        value: desktop,
      },
      {
        id: `${category}:after`,
        category,
        period: 'After' as const,
        value: mobile,
      },
    ]
  })
}
