export interface BoxPoint {
  id: string
  group: 'Alpha' | 'Beta' | 'Gamma'
  value: number
}

const groups: readonly BoxPoint['group'][] = ['Alpha', 'Beta', 'Gamma']

export function boxData(revision = 0): readonly BoxPoint[] {
  return groups.flatMap((group, groupIndex) =>
    Array.from({ length: 31 }, (_, index) => {
      const centered = index - 15
      const value =
        42 +
        groupIndex * 13 +
        centered * (0.72 + groupIndex * 0.08) +
        Math.sin(index * 1.7 + revision) * 4 +
        (index === 0 ? -18 : 0) +
        (index === 30 ? 19 : 0)
      return {
        id: `${group}:${index}`,
        group,
        value: Math.round(value * 100) / 100,
      }
    }),
  )
}
