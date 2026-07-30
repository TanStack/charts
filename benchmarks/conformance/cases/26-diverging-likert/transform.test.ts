import { describe, expect, it } from 'vitest'
import { survey } from '@charts-poc/demo-data/survey'
import { likertQuestions, selectLikertSurvey } from './selection'
import { likertSegments } from './transform'

describe('likertSegments', () => {
  it('counts raw responses and centers neutral observations on zero', () => {
    const likertSurvey = selectLikertSurvey(survey)
    const questions = likertQuestions(likertSurvey)
    const segments = likertSegments(likertSurvey)

    expect(segments).toHaveLength(questions.length * 5)
    for (const Question of questions) {
      const questionSegments = segments.filter(
        (segment) => segment.Question === Question,
      )
      const neutral = questionSegments.find(
        (segment) => segment.Response === 'Neutral',
      )
      expect(
        questionSegments.reduce((total, segment) => total + segment.count, 0),
      ).toBe(likertSurvey.filter((row) => row.Question === Question).length)
      expect(neutral?.x1).toBe(-(neutral?.count ?? 0) / 2)
      expect(neutral?.x2).toBe((neutral?.count ?? 0) / 2)
    }
  })
})
