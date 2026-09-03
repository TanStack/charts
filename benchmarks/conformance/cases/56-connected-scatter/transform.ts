import type { DrivingRow } from '@tanstack/charts-data/driving'

export interface DirectionSegment {
  fromYear: number
  toYear: number
  miles1: number
  gas1: number
  miles2: number
  gas2: number
}

export function directionSegments(
  rows: readonly DrivingRow[],
): readonly DirectionSegment[] {
  const targetIndexes = [14, 28, 42]
  const segments: DirectionSegment[] = []

  for (const targetIndex of targetIndexes) {
    const source = rows[targetIndex - 1]
    const target = rows[targetIndex]
    if (source === undefined || target === undefined) continue
    segments.push({
      fromYear: source.year,
      toYear: target.year,
      miles1: source.miles,
      gas1: source.gas,
      miles2: target.miles,
      gas2: target.gas,
    })
  }

  return segments
}
