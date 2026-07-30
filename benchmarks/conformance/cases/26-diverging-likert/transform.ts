import { group } from 'd3-array'
import { likertResponses } from './selection'
import type { LikertResponse, LikertSurveyRow } from './selection'

export interface LikertSegment {
  readonly Question: string
  readonly Response: LikertResponse
  readonly count: number
  readonly x1: number
  readonly x2: number
}

export function likertSegments(
  rows: readonly LikertSurveyRow[],
): readonly LikertSegment[] {
  return [...group(rows, (row) => row.Question)].flatMap(
    ([Question, questionRows]) => {
      const counts = new Map<LikertResponse, number>(
        likertResponses.map((Response) => [
          Response,
          questionRows.filter((row) => row.Response === Response).length,
        ]),
      )
      let cursor =
        -(counts.get('Strongly Disagree') ?? 0) -
        (counts.get('Disagree') ?? 0) -
        (counts.get('Neutral') ?? 0) / 2

      return likertResponses.map((Response) => {
        const count = counts.get(Response) ?? 0
        const x1 = cursor
        cursor += count
        return { Question, Response, count, x1, x2: cursor }
      })
    },
  )
}
