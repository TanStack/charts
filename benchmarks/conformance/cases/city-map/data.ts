import type { CityDatum } from '@tanstack/charts/react/city'

export type District = 1 | 2 | 3 | 4 | 5 | 6 | 7
export interface Store extends CityDatum {
  mask: District
}
export const districtMasks: District[] = [1, 2, 4, 3, 5, 6, 7]
export const districtColors = [
  '#4b91ef',
  '#e281af',
  '#ecc456',
  '#ab7cdd',
  '#47b8b2',
  '#e99b55',
  '#7777ca',
]
const categories = [
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'wholesale', label: 'Wholesale' },
]

export function storesForRevision(revision: number): Store[] {
  return Array.from({ length: 140 }, (_, index) => {
    const mask = ((index % 7) + 1) as District
    return {
      id: `store-${index}`,
      name: `Store ${String(index + 1).padStart(3, '0')}`,
      metric: {
        label: 'Orders',
        value: ((index * 397 + revision * 71) % 5000) + 100,
      },
      categories: categories.filter((_, bit) => mask & (1 << bit)),
      mask,
      status:
        index % 9 === 0 ? 'critical' : index % 5 === 0 ? 'warning' : 'healthy',
    }
  })
}
