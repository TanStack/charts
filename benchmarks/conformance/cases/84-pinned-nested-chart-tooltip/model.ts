import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

export type CompletePenguin = PenguinsRow & {
  readonly culmen_length_mm: number
  readonly culmen_depth_mm: number
  readonly flipper_length_mm: number
  readonly body_mass_g: number
  readonly sex: string
}

export const nestedTooltipIds = [
  'adelie-torgersen-male',
  'adelie-biscoe-female',
  'adelie-dream-female',
  'chinstrap-dream-male',
  'gentoo-biscoe-male',
] as const

export type NestedTooltipId = (typeof nestedTooltipIds)[number]

export function isNestedTooltipId(value: unknown): value is NestedTooltipId {
  return nestedTooltipIds.some((id) => id === value)
}

export function penguinTooltipId(row: PenguinsRow): NestedTooltipId | null {
  const key = `${row.species}-${row.island}-${row.sex}`.toLowerCase()
  return isNestedTooltipId(key) ? key : null
}

export function penguinTooltipLabel(row: CompletePenguin) {
  return `${row.species} ${row.sex.toLowerCase()} on ${row.island}`
}

export function nestedTooltipRows(
  rows: readonly PenguinsRow[],
  revision = 0,
): readonly CompletePenguin[] {
  const representatives = nestedTooltipIds.flatMap((id) => {
    const row = rows.find(
      (row): row is CompletePenguin =>
        isCompletePenguin(row) && penguinTooltipId(row) === id,
    )
    return row ? [row] : []
  })
  return revision % 2 === 1 ? representatives.reverse() : representatives
}

export function penguinCohort(
  rows: readonly PenguinsRow[],
  datum: CompletePenguin,
): readonly CompletePenguin[] {
  const nearest = rows
    .filter(
      (row): row is CompletePenguin =>
        isCompletePenguin(row) && row.species === datum.species,
    )
    .sort(
      (a, b) =>
        Math.abs(a.flipper_length_mm - datum.flipper_length_mm) -
        Math.abs(b.flipper_length_mm - datum.flipper_length_mm),
    )
  const distinctLengths = new Set<number>()
  return nearest
    .filter((row) => {
      if (distinctLengths.has(row.flipper_length_mm)) return false
      distinctLengths.add(row.flipper_length_mm)
      return true
    })
    .slice(0, 4)
    .sort((a, b) => a.flipper_length_mm - b.flipper_length_mm)
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
