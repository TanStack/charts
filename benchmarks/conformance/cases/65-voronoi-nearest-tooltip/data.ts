export type VoronoiGroup = 'Alpha' | 'Beta' | 'Gamma'

export interface VoronoiPoint {
  id: string
  label: string
  group: VoronoiGroup
  x: number
  y: number
}

export const voronoiGroups: readonly VoronoiGroup[] = ['Alpha', 'Beta', 'Gamma']

export const voronoiColors: Readonly<Record<VoronoiGroup, string>> = {
  Alpha: '#2563eb',
  Beta: '#0d9488',
  Gamma: '#d97706',
}

const coordinates: readonly (readonly [number, number])[] = [
  [12, 18],
  [22, 72],
  [31, 43],
  [39, 84],
  [47, 24],
  [55, 61],
  [63, 37],
  [71, 78],
  [82, 52],
  [89, 20],
  [16, 48],
  [27, 91],
  [44, 55],
  [58, 12],
  [68, 94],
  [77, 31],
  [86, 71],
  [94, 42],
]

export function voronoiData(revision: number): readonly VoronoiPoint[] {
  const delta = revision % 2 === 0 ? 0 : 2

  return coordinates.map(([x, y], index) => ({
    id: `point-${index}`,
    label: `Point ${index + 1}`,
    group: voronoiGroups[index % voronoiGroups.length] ?? 'Alpha',
    x: Math.min(98, x + (index % 2 === 0 ? delta : -delta)),
    y: Math.min(98, y + (index % 3 === 0 ? -delta : delta)),
  }))
}
