export const composedCategories = [
  'Page A',
  'Page B',
  'Page C',
  'Page D',
  'Page E',
  'Page F',
] as const

export type ComposedCategory = (typeof composedCategories)[number]

export interface ComposedDatum {
  name: ComposedCategory
  uv: number
  pv: number
  amt: number
  cnt: number
}

const initialData: readonly ComposedDatum[] = [
  { name: 'Page A', uv: 590, pv: 800, amt: 1_400, cnt: 490 },
  { name: 'Page B', uv: 868, pv: 967, amt: 1_506, cnt: 590 },
  { name: 'Page C', uv: 1_397, pv: 1_098, amt: 989, cnt: 350 },
  { name: 'Page D', uv: 1_480, pv: 1_200, amt: 1_228, cnt: 480 },
  { name: 'Page E', uv: 1_520, pv: 1_108, amt: 1_100, cnt: 460 },
  { name: 'Page F', uv: 1_400, pv: 680, amt: 1_700, cnt: 380 },
]

export function composedData(revision = 0): readonly ComposedDatum[] {
  const updated = revision % 2 === 1
  if (!updated) return initialData

  return initialData.map((row) =>
    row.name === 'Page C'
      ? { ...row, uv: 1_180, cnt: 430 }
      : row.name === 'Page E'
        ? { ...row, pv: 1_280, amt: 1_260 }
        : row,
  )
}
