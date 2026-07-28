export const aggregateCategories = [
  'Search',
  'Direct',
  'Social',
  'Email',
  'Partners',
  'Other',
] as const

export type AggregateCategory = (typeof aggregateCategories)[number]

export interface AggregateEvent {
  id: string
  category: AggregateCategory
  amount: number
}

const amounts: Record<AggregateCategory, readonly number[]> = {
  Search: [48, 42, 39, 46],
  Direct: [34, 31, 36, 30],
  Social: [27, 24, 30, 26],
  Email: [18, 22, 20, 19],
  Partners: [25, 19, 24, 21],
  Other: [11, 13, 9, 12],
}

export const aggregateValueDomain: readonly [number, number] = [0, 200]

export function aggregateData(revision = 0): readonly AggregateEvent[] {
  const updated = revision % 2 === 1

  return aggregateCategories.flatMap((category, categoryIndex) =>
    amounts[category].map((amount, rowIndex) => ({
      id: `${category}:${rowIndex}`,
      category,
      amount:
        amount + (updated ? (((categoryIndex + rowIndex) % 3) - 1) * 2 : 0),
    })),
  )
}
