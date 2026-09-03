import type { CarsRow } from '@tanstack/charts-data/cars'

export type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
  readonly 'power (hp)': number
}

export interface FreeCursorFraction {
  x: number
  y: number
}

export const freeCursorXDomain: readonly [number, number] = [50, 190]
export const freeCursorYDomain: readonly [number, number] = [10, 40]

const carObservations = new Set([
  'Datsun 710:74',
  'Honda Accord:82',
  'Nissan Stanza XE:82',
  'AMC Matador:71',
  'Mercury Cougar Brougham:77',
  'Cadillac Seville:76',
])

export function freeCursorRows(
  rows: readonly CarsRow[],
): readonly CompleteCar[] {
  return rows
    .filter(
      (row): row is CompleteCar =>
        row['power (hp)'] !== null &&
        row['economy (mpg)'] !== null &&
        carObservations.has(`${row.name}:${row.year}`),
    )
    .sort((a, b) => a['power (hp)'] - b['power (hp)'])
}

export function freeCursorFractionFromAnchor(
  anchor: string,
): FreeCursorFraction | null {
  if (!anchor.startsWith('fraction:')) return null
  const [xText, yText] = anchor.slice('fraction:'.length).split(',')
  if (xText === undefined || yText === undefined) return null
  const x = Number(xText)
  const y = Number(yText)
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    return null
  }
  return { x, y }
}
