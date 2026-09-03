import { crimeanWar } from '@tanstack/charts-data/crimean-war'

export const stackedCursorCauses = ['disease', 'wounds', 'other'] as const
export const stackedCursorColors = ['#4269d0', '#ff725c', '#efb118']
export const stackedCursorBarInset = 4
export const stackedCursorOutset = 4
export const stackedCursorBandInset =
  stackedCursorBarInset - stackedCursorOutset

export type StackedCursorCause = (typeof stackedCursorCauses)[number]

export interface StackedCursorRow {
  id: string
  period: string
  cause: StackedCursorCause
  deaths: number
  start: number
  end: number
}

export interface StackedCursorBandRow {
  period: string
  total: number
}

export type StackedCursorDatum = StackedCursorRow | StackedCursorBandRow

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const integer = new Intl.NumberFormat('en-US')

export function formatStackedCursorEndpoint(value: number) {
  return integer.format(value)
}

const sourceRows = crimeanWar.slice(3, 11)

const revisedMultipliers = [
  [0.72, 1.5, 1.22],
  [1.2, 0.65, 0.82],
  [0.78, 1.3, 1.18],
  [1.18, 0.72, 0.86],
  [0.74, 1.28, 1.22],
  [1.15, 0.7, 0.86],
  [0.72, 1.35, 1.15],
  [1.18, 0.68, 0.84],
] as const

export const stackedCursorPeriods = sourceRows.map((row) =>
  month.format(row.date),
)

const stackedCursorRevisions = [false, true].map((revised) =>
  sourceRows.flatMap((row, periodIndex) => {
    const period = month.format(row.date)
    let start = 0
    return stackedCursorCauses.map((cause, causeIndex) => {
      const multiplier = revised
        ? (revisedMultipliers[periodIndex]?.[causeIndex] ?? 1)
        : 1
      const deaths = Math.round(row[cause] * multiplier)
      const result = {
        id: `${period}:${cause}`,
        period,
        cause,
        deaths,
        start,
        end: start + deaths,
      }
      start = result.end
      return result
    })
  }),
)

export function stackedCursorRowsForRevision(
  revision: number,
): readonly StackedCursorRow[] {
  const index = Number.isFinite(revision)
    ? Math.abs(Math.trunc(revision)) % stackedCursorRevisions.length
    : 0
  return stackedCursorRevisions[index] ?? stackedCursorRevisions[0]!
}

export const stackedCursorRows = stackedCursorRowsForRevision(0)

export const stackedCursorMaximum =
  Math.ceil(
    Math.max(
      ...stackedCursorRevisions.flatMap((rows) => rows.map((row) => row.end)),
    ) / 500,
  ) * 500

export const stackedCursorBands: readonly StackedCursorBandRow[] =
  stackedCursorPeriods.map((period) => ({
    period,
    total: stackedCursorMaximum,
  }))
