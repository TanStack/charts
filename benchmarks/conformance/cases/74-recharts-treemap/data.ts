export const bundleFamilies = ['Recharts', 'React', 'D3', 'Utilities'] as const

export type BundleFamily = (typeof bundleFamilies)[number]

export interface BundleNode {
  [key: string]: unknown
  name: string
  size?: number
  fill?: string
  children?: readonly BundleNode[]
}

export const bundleColors: Readonly<Record<BundleFamily, string>> = {
  Recharts: '#2563eb',
  React: '#8b5cf6',
  D3: '#10b981',
  Utilities: '#f97316',
}

const initialGroups: readonly BundleNode[] = [
  {
    name: 'Recharts',
    children: [
      { name: 'Axis', size: 24_600, fill: bundleColors.Recharts },
      { name: 'Shape', size: 19_200, fill: bundleColors.Recharts },
      { name: 'Scale', size: 13_800, fill: bundleColors.Recharts },
    ],
  },
  {
    name: 'React',
    children: [
      { name: 'Core', size: 18_700, fill: bundleColors.React },
      { name: 'DOM', size: 16_900, fill: bundleColors.React },
      { name: 'Redux', size: 10_400, fill: bundleColors.React },
    ],
  },
  {
    name: 'D3',
    children: [
      { name: 'Array', size: 14_900, fill: bundleColors.D3 },
      { name: 'Shape', size: 12_600, fill: bundleColors.D3 },
      { name: 'Scale', size: 11_300, fill: bundleColors.D3 },
    ],
  },
  {
    name: 'Utilities',
    children: [
      { name: 'Immer', size: 9_700, fill: bundleColors.Utilities },
      { name: 'Lodash', size: 8_900, fill: bundleColors.Utilities },
      { name: 'Date', size: 7_400, fill: bundleColors.Utilities },
    ],
  },
]

export function bundleGroups(revision = 0): readonly BundleNode[] {
  if (revision % 2 === 0) return initialGroups

  return initialGroups.map((group) => ({
    ...group,
    children: group.children?.map((leaf) =>
      leaf.name === 'Axis'
        ? { ...leaf, size: 21_800 }
        : leaf.name === 'DOM'
          ? { ...leaf, size: 19_600 }
          : leaf.name === 'Array'
            ? { ...leaf, size: 16_500 }
            : leaf,
    ),
  }))
}

export function bundleTree(revision = 0): BundleNode {
  return {
    name: 'Bundle',
    children: bundleGroups(revision),
  }
}
