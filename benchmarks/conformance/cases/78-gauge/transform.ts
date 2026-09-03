export interface GaugeDatum {
  id: 'value' | 'remainder'
  label: string
  value: number
}

export function gaugeSegments(value: number): readonly GaugeDatum[] {
  return [
    { id: 'value', label: 'Agree', value },
    {
      id: 'remainder',
      label: 'Other responses',
      value: 100 - value,
    },
  ]
}

export function agreementPercent(
  rows: readonly SurveyRow[],
  question: string,
): number {
  const responses = rows.filter((row) => row.Question === question)
  const agreements = responses.filter(
    (row) => row.Response === 'Agree' || row.Response === 'Strongly Agree',
  )
  return responses.length === 0
    ? 0
    : Math.round((agreements.length / responses.length) * 100)
}
import type { SurveyRow } from '@tanstack/charts-data/survey'
