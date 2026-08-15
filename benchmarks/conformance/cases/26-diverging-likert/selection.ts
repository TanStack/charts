import type { SurveyRow } from '@tanstack/charts-data/survey'

export type LikertResponse =
  'Strongly Disagree' | 'Disagree' | 'Neutral' | 'Agree' | 'Strongly Agree'

export interface LikertSurveyRow extends SurveyRow {
  readonly Response: LikertResponse
}

export const likertResponses: readonly LikertResponse[] = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
]

const responseSet = new Set<string>(likertResponses)

export function selectLikertSurvey(
  rows: readonly SurveyRow[],
): readonly LikertSurveyRow[] {
  return rows.filter((row): row is LikertSurveyRow =>
    responseSet.has(row.Response),
  )
}

export function likertQuestions(rows: readonly LikertSurveyRow[]) {
  return [...new Set(rows.map((row) => row.Question))]
}
