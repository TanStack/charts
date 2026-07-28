export const marginalGroups = ['North', 'South', 'West'] as const

export type MarginalGroup = (typeof marginalGroups)[number]

export interface MarginalPoint {
  id: string
  x: number
  y: number
  group: MarginalGroup
}

export function marginalData(revision = 0): readonly MarginalPoint[] {
  const updated = revision % 2 === 1

  return Array.from({ length: 60 }, (_, index) => {
    const groupIndex = index % marginalGroups.length
    const group = marginalGroups[groupIndex] ?? 'North'
    const rawX = 7 + ((index * 17 + groupIndex * 9) % 70)
    const rawY =
      8 + ((index * 29 + groupIndex * 7 + Math.floor(index / 3) * 5) % 68)
    const x = Math.min(79, rawX + (updated && index % 7 === 0 ? 3 : 0))
    const y = Math.max(2, rawY - (updated && index % 8 === 0 ? 3 : 0))

    return {
      id: `${group}:${index}`,
      x,
      y,
      group,
    }
  })
}
