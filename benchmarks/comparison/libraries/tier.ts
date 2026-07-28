import type { BenchmarkDatum, BenchmarkInput } from '../types'

export const seriesColors = ['#2563eb', '#f97316'] as const

export function visibleRows(
  input: BenchmarkInput,
  advanced: boolean,
): readonly BenchmarkDatum[] {
  return advanced ? [...input.rows, ...input.secondaryRows] : input.rows
}

export function wideRows(input: BenchmarkInput) {
  return input.rows.map((row, index) => ({
    ...row,
    yB: input.secondaryRows[index]?.y ?? 0,
  }))
}
