export const mixedBarCategories = [
  'Page A',
  'Page B',
  'Page C',
  'Page D',
  'Page E',
  'Page F',
  'Page G',
] as const

export type MixedBarCategory = (typeof mixedBarCategories)[number]

export interface MixedBarDatum {
  name: MixedBarCategory
  uv: number
  pv: number
  amt: number
}

const initialData: readonly MixedBarDatum[] = [
  { name: 'Page A', uv: 4_000, pv: 2_400, amt: 2_400 },
  { name: 'Page B', uv: 3_000, pv: 1_398, amt: 2_210 },
  { name: 'Page C', uv: 2_000, pv: 9_800, amt: 2_290 },
  { name: 'Page D', uv: 2_780, pv: 3_908, amt: 2_000 },
  { name: 'Page E', uv: 1_890, pv: 4_800, amt: 2_181 },
  { name: 'Page F', uv: 2_390, pv: 3_800, amt: 2_500 },
  { name: 'Page G', uv: 3_490, pv: 4_300, amt: 2_100 },
]

export function mixedBarData(revision = 0): readonly MixedBarDatum[] {
  const updated = revision % 2 === 1
  if (!updated) return initialData

  return initialData.map((row) =>
    row.name === 'Page B'
      ? { ...row, uv: 3_600, amt: 2_450 }
      : row.name === 'Page F'
        ? { ...row, pv: 4_250, amt: 2_200 }
        : row,
  )
}
