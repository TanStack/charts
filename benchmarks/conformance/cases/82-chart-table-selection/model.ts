import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export type CompletePenguin = PenguinsRow & {
  readonly culmen_length_mm: number
  readonly culmen_depth_mm: number
  readonly flipper_length_mm: number
  readonly body_mass_g: number
  readonly sex: string
}

export const selectionIds = [
  'adelie-torgersen-male',
  'adelie-biscoe-female',
  'adelie-dream-female',
  'chinstrap-dream-male',
  'gentoo-biscoe-male',
] as const

export type SelectionId = (typeof selectionIds)[number]

export function isSelectionId(value: unknown): value is SelectionId {
  return selectionIds.some((id) => id === value)
}

export function penguinSelectionId(row: PenguinsRow): SelectionId | null {
  const key = `${row.species}-${row.island}-${row.sex}`.toLowerCase()
  return isSelectionId(key) ? key : null
}

export function penguinSelectionLabel(row: CompletePenguin) {
  return `${row.species} ${row.sex.toLowerCase()} on ${row.island}`
}

export function selectionRowId(row: CompletePenguin): SelectionId {
  const id = penguinSelectionId(row)
  if (!id) throw new TypeError('Expected a chart/table selection row')
  return id
}

export function selectionRows(
  rows: readonly PenguinsRow[],
  revision = 0,
): readonly CompletePenguin[] {
  const representatives = selectionIds.flatMap((id) => {
    const row = rows.find(
      (row): row is CompletePenguin =>
        isCompletePenguin(row) && penguinSelectionId(row) === id,
    )
    return row ? [row] : []
  })
  return revision % 2 === 1 ? representatives.reverse() : representatives
}

function isCompletePenguin(row: PenguinsRow): row is CompletePenguin {
  return (
    row.culmen_length_mm !== null &&
    row.culmen_depth_mm !== null &&
    row.flipper_length_mm !== null &&
    row.body_mass_g !== null &&
    row.sex !== null
  )
}
