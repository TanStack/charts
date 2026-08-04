import { crimeanWar } from '@charts-poc/demo-data/crimean-war'

export const stackedCursorCauses = ['disease', 'wounds', 'other'] as const
export const stackedCursorColors = ['#4269d0', '#ff725c', '#efb118']
export const stackedCursorBarInset = 4
export const stackedCursorOutset = 2
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

const sourceRows = crimeanWar.slice(3, 11)

export const stackedCursorPeriods = sourceRows.map((row) =>
  month.format(row.date),
)

export const stackedCursorRows: readonly StackedCursorRow[] =
  sourceRows.flatMap((row) => {
    const period = month.format(row.date)
    let start = 0
    return stackedCursorCauses.map((cause) => {
      const deaths = row[cause]
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
  })

export const stackedCursorMaximum =
  Math.ceil(Math.max(...stackedCursorRows.map((row) => row.end)) / 500) * 500

export const stackedCursorBands: readonly StackedCursorBandRow[] =
  stackedCursorPeriods.map((period) => ({
    period,
    total: stackedCursorMaximum,
  }))
