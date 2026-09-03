import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export interface PenguinSpeciesCount {
  species: string
  male: number
  female: number
}

export function countPenguinsBySpecies(
  rows: readonly PenguinsRow[],
): readonly PenguinSpeciesCount[] {
  const counts = new Map<string, { male: number; female: number }>()

  for (const row of rows) {
    if (row.sex !== 'MALE' && row.sex !== 'FEMALE') continue

    const count = counts.get(row.species) ?? { male: 0, female: 0 }
    count[row.sex === 'MALE' ? 'male' : 'female'] += 1
    counts.set(row.species, count)
  }

  return Array.from(counts, ([species, count]) => ({
    species,
    ...count,
  }))
}

export function divergeMaleCounts(
  rows: readonly PenguinSpeciesCount[],
): readonly PenguinSpeciesCount[] {
  return rows.map((row) => ({
    ...row,
    male: -row.male,
  }))
}
