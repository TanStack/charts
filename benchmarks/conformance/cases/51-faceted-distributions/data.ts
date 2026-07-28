export type DistributionGroup = 'Baseline' | 'Variant' | 'Experimental'

export interface FacetedDistributionPoint {
  id: string
  group: DistributionGroup
  value: number
}

export const distributionGroups: readonly DistributionGroup[] = [
  'Baseline',
  'Variant',
  'Experimental',
]

const profileCounts: readonly (readonly number[])[] = [
  [2, 4, 8, 14, 20, 18, 12, 7, 3, 2],
  [1, 3, 6, 10, 14, 17, 17, 13, 7, 2],
  [2, 6, 13, 18, 17, 13, 10, 6, 3, 2],
]

export function facetedDistributionData(
  revision = 0,
): readonly FacetedDistributionPoint[] {
  return distributionGroups.flatMap((group, groupIndex) =>
    (profileCounts[groupIndex] ?? []).flatMap((count, binIndex) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${group}:${binIndex}:${index}`,
        group,
        value:
          binIndex * 10 +
          1 +
          (8 * (index + 0.5)) / count +
          (((index + binIndex + groupIndex + revision) % 3) - 1) * 0.1,
      })),
    ),
  )
}
