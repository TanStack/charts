import type { SurveyRow } from '@tanstack/charts-data/survey'

export const mosaicResponses = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
] as const

export type MosaicResponse = (typeof mosaicResponses)[number]

export type MosaicSurveyRow = SurveyRow & {
  readonly Response: MosaicResponse
}

const responseSet = new Set<string>(mosaicResponses)

export function isMosaicResponse(row: SurveyRow): row is MosaicSurveyRow {
  return responseSet.has(row.Response)
}
