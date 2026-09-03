import { aapl, type AaplRow } from '@tanstack/charts-data/aapl'
import { cars } from '@tanstack/charts-data/cars'
import {
  industries,
  type IndustriesRow,
} from '@tanstack/charts-data/industries'
import { penguins, type PenguinsRow } from '@tanstack/charts-data/penguins'
import {
  sfTemperatures,
  type SfTemperaturesRow,
} from '@tanstack/charts-data/sf-temperatures'
import { simpsons, type SimpsonsRow } from '@tanstack/charts-data/simpsons'
import { survey, type SurveyRow } from '@tanstack/charts-data/survey'
import { travelers, type TravelersRow } from '@tanstack/charts-data/travelers'
import { weather, type WeatherRow } from '@tanstack/charts-data/weather'
import { mean } from 'd3-array'

// Keep the source observations intact; derive only what each chart requires.
export type TimeRange = '1y' | '3y' | 'all'

export const industryNames = [
  'Manufacturing',
  'Construction',
  'Finance',
] as const

export const industryColors: Record<(typeof industryNames)[number], string> = {
  Manufacturing: '#ff4f57',
  Construction: '#ff7a59',
  Finance: '#f2c66d',
}

export const surveyResponses = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
] as const

export const responseColors: Record<(typeof surveyResponses)[number], string> =
  {
    'Strongly Disagree': '#ff4f57',
    Disagree: '#ff7a59',
    Neutral: '#6f6d78',
    Agree: '#8579ff',
    'Strongly Agree': '#45d49c',
  }

export interface IndustryStackPoint extends IndustriesRow {
  readonly y1: number
  readonly y2: number
}

export interface CarEconomyRow {
  readonly cylinders: number
  readonly economy: number
  readonly overallEconomy: number
}

export interface SurveyStackPoint {
  readonly Question: string
  readonly Response: string
  readonly count: number
  readonly y1: number
  readonly y2: number
}

export interface SurveyCell extends SurveyRow {
  readonly column: number
  readonly row: number
}

export interface SurveyResponseCount {
  readonly Response: string
  readonly count: number
}

export interface DashboardData {
  readonly aapl: readonly AaplRow[]
  readonly industries: readonly IndustryStackPoint[]
  readonly penguins: readonly PenguinsRow[]
  readonly sfTemperatures: readonly SfTemperaturesRow[]
  readonly simpsons: readonly SimpsonsRow[]
  readonly travelers: readonly TravelersRow[]
  readonly weather: readonly WeatherRow[]
  readonly carEconomy: readonly CarEconomyRow[]
  readonly surveyStack: readonly SurveyStackPoint[]
  readonly surveyCells: readonly SurveyCell[]
  readonly surveyResponseCounts: readonly SurveyResponseCount[]
  readonly agreementPercent: number
  readonly latestUnemployment: number
}

const yearsByRange: Record<TimeRange, number> = {
  '1y': 1,
  '3y': 3,
  all: Number.POSITIVE_INFINITY,
}

export function createDashboardData(range: TimeRange): DashboardData {
  const selectedIndustries = recentRows(
    industries.filter((row) =>
      industryNames.includes(row.industry as (typeof industryNames)[number]),
    ),
    (row) => row.date,
    range,
  )
  const industryStack = stackIndustries(selectedIndustries)
  const surveyResponseCounts = countResponses(
    survey.filter((row) => row.Question === 'Q1'),
  )
  const agreementCount = surveyResponseCounts
    .filter(
      (row) => row.Response === 'Agree' || row.Response === 'Strongly Agree',
    )
    .reduce((sum, row) => sum + row.count, 0)
  const responseTotal = surveyResponseCounts.reduce(
    (sum, row) => sum + row.count,
    0,
  )

  return {
    aapl: recentRows(aapl, (row) => row.Date, range),
    industries: industryStack,
    penguins: penguins.filter(
      (row) =>
        row.culmen_length_mm !== null &&
        row.culmen_depth_mm !== null &&
        row.body_mass_g !== null,
    ),
    sfTemperatures: recentRows(sfTemperatures, (row) => row.date, range),
    simpsons: simpsons.filter(
      (row) => row.season <= 25 && row.imdb_rating !== null,
    ),
    travelers: recentRows(travelers, (row) => row.date, range),
    weather: recentRows(weather, (row) => row.date, range),
    carEconomy: summarizeCarEconomy(),
    surveyStack: stackSurveyResponses(),
    surveyCells: survey
      .filter((row) => row.Question === 'Q1')
      .map((row, index) => ({
        ...row,
        column: index % 21,
        row: 4 - Math.floor(index / 21),
      })),
    surveyResponseCounts,
    agreementPercent:
      responseTotal === 0 ? 0 : (agreementCount / responseTotal) * 100,
    latestUnemployment: latestIndustryTotal(industryStack),
  }
}

function recentRows<T>(
  rows: readonly T[],
  date: (row: T) => Date,
  range: TimeRange,
): readonly T[] {
  const sorted = [...rows].sort(
    (left, right) => date(left).getTime() - date(right).getTime(),
  )
  const years = yearsByRange[range]
  const end = sorted.at(-1)
  if (!end || !Number.isFinite(years)) return sorted

  const cutoff = new Date(date(end))
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years)
  return sorted.filter((row) => date(row) >= cutoff)
}

function stackIndustries(
  rows: readonly IndustriesRow[],
): readonly IndustryStackPoint[] {
  const byDate = new Map<number, Map<string, IndustriesRow>>()
  for (const row of rows) {
    const timestamp = row.date.getTime()
    const dateRows = byDate.get(timestamp) ?? new Map<string, IndustriesRow>()
    dateRows.set(row.industry, row)
    byDate.set(timestamp, dateRows)
  }

  const stack: IndustryStackPoint[] = []
  for (const timestamp of [...byDate.keys()].sort(
    (left, right) => left - right,
  )) {
    const dateRows = byDate.get(timestamp)
    let baseline = 0
    for (const industry of industryNames) {
      const row = dateRows?.get(industry)
      if (!row) continue
      stack.push({
        ...row,
        y1: baseline,
        y2: baseline + row.unemployed,
      })
      baseline += row.unemployed
    }
  }
  return stack
}

function summarizeCarEconomy(): readonly CarEconomyRow[] {
  const complete = cars.filter(
    (row) =>
      row['economy (mpg)'] !== null &&
      (row.cylinders === 4 || row.cylinders === 6 || row.cylinders === 8),
  )
  const overallEconomy =
    mean(complete, (row) => row['economy (mpg)'] ?? undefined) ?? 0

  return [4, 6, 8].map((cylinders) => ({
    cylinders,
    economy:
      mean(
        complete.filter((row) => row.cylinders === cylinders),
        (row) => row['economy (mpg)'] ?? undefined,
      ) ?? 0,
    overallEconomy,
  }))
}

function stackSurveyResponses(): readonly SurveyStackPoint[] {
  const rows: SurveyStackPoint[] = []
  for (const question of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']) {
    const responses = survey.filter((row) => row.Question === question)
    let baseline = 0
    for (const response of surveyResponses) {
      const count = responses.filter((row) => row.Response === response).length
      rows.push({
        Question: question,
        Response: response,
        count,
        y1: baseline,
        y2: baseline + count,
      })
      baseline += count
    }
  }
  return rows
}

function countResponses(
  rows: readonly SurveyRow[],
): readonly SurveyResponseCount[] {
  return surveyResponses.map((Response) => ({
    Response,
    count: rows.filter((row) => row.Response === Response).length,
  }))
}

function latestIndustryTotal(rows: readonly IndustryStackPoint[]): number {
  const latestDate = rows.at(-1)?.date.getTime()
  if (latestDate === undefined) return 0
  return Math.max(
    ...rows
      .filter((row) => row.date.getTime() === latestDate)
      .map((row) => row.y2),
  )
}
