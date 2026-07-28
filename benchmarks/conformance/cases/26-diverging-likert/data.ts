export type LikertResponse =
  'Strongly disagree' | 'Disagree' | 'Neutral' | 'Agree' | 'Strongly agree'

export interface LikertPoint {
  id: string
  question: string
  response: LikertResponse
  signedValue: number
}

export const likertQuestions: readonly string[] = [
  'Easy to learn',
  'Fast in practice',
  'Flexible enough',
  'Would recommend',
]

export const likertResponses: readonly LikertResponse[] = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
]

const baseValues: readonly (readonly number[])[] = [
  [8, 14, 18, 36, 24],
  [12, 18, 20, 31, 19],
  [6, 12, 16, 38, 28],
  [10, 15, 17, 33, 25],
]

export function likertData(revision = 0): readonly LikertPoint[] {
  return likertQuestions.flatMap((question, questionIndex) =>
    likertResponses.map((response, responseIndex) => {
      const base = baseValues[questionIndex]?.[responseIndex] ?? 0
      const adjustment =
        revision === 0 ? 0 : ((questionIndex + responseIndex) % 3) - 1
      const magnitude = Math.max(1, base + adjustment)
      return {
        id: `${question}:${response}`,
        question,
        response,
        signedValue: responseIndex < 2 ? -magnitude : magnitude,
      }
    }),
  )
}
