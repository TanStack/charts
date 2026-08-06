import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { survey } from '@charts-poc/demo-data/survey'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  likertQuestions,
  likertResponses,
  selectLikertSurvey,
} from './selection'
import type { LikertSurveyRow } from './selection'
import { likertCounts, likertDefinition } from './tanstack'

type LikertCount = (typeof likertCounts)[number]

describe('definition-owned anchored Likert stack', () => {
  it('counts source responses once with exact lineage', () => {
    const selected = selectLikertSurvey(survey)
    const questions = likertQuestions(selected)

    expectTypeOf<LikertCount['Question']>().toEqualTypeOf<string>()
    expectTypeOf<LikertCount['Response']>().toEqualTypeOf<
      (typeof likertResponses)[number]
    >()
    expectTypeOf<LikertCount['count']>().toEqualTypeOf<number>()
    expectTypeOf<
      LikertCount['source'][number]
    >().toEqualTypeOf<LikertSurveyRow>()
    expect(likertCounts).toHaveLength(questions.length * likertResponses.length)

    for (const row of likertCounts) {
      expect(row.count).toBe(row.source.length)
      expect(row.sourceIndexes).toHaveLength(row.count)
      row.sourceIndexes.forEach((sourceIndex, index) => {
        expect(row.source[index]).toBe(selected[sourceIndex])
        expect(row.source[index]?.Question).toBe(row.Question)
        expect(row.source[index]?.Response).toBe(row.Response)
      })
    }
  })

  it('centers each neutral interval and retains authored response order', () => {
    const bars = render().points.filter(
      ({ markId }) => markId === 'likert-responses',
    )
    const questions = likertQuestions(selectLikertSurvey(survey))

    expect(bars).toHaveLength(questions.length * likertResponses.length)
    for (const Question of questions) {
      const questionBars = bars.filter(
        ({ datum }) => typeof datum !== 'number' && datum.Question === Question,
      )
      const counts = new Map(
        questionBars.map(({ datum }) => {
          if (typeof datum === 'number') throw new TypeError('Unexpected rule')
          return [datum.Response, datum.count] as const
        }),
      )
      let cursor =
        -(counts.get('Strongly Disagree') ?? 0) -
        (counts.get('Disagree') ?? 0) -
        (counts.get('Neutral') ?? 0) / 2

      for (const Response of likertResponses) {
        const point = questionBars.find(({ group }) => group === Response)
        const count = counts.get(Response) ?? 0
        expect(point?.x1Value).toBeCloseTo(cursor)
        cursor += count
        expect(point?.x2Value).toBeCloseTo(cursor)
        expect(point?.xValue).toBe(count)
      }
      const neutral = questionBars.find(({ group }) => group === 'Neutral')
      expect(neutral?.x1Value).toBe(-(counts.get('Neutral') ?? 0) / 2)
      expect(neutral?.x2Value).toBe((counts.get('Neutral') ?? 0) / 2)
    }
  })

  it('keeps counting and anchored stacking visible in the definition', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/26-diverging-likert',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(source).toContain('groupBy(likertSurvey')
    expect(source).toContain("outputs: { count: { reduce: 'count' } }")
    expect(source).toContain("x: 'count'")
    expect(source).toContain('order: likertResponses')
    expect(source).toContain("anchor: { series: 'Neutral', fraction: 0.5 }")
    expect(source).not.toContain('likertSegments')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('let cursor')
    expect(existsSync(resolve(directory, 'transform.ts'))).toBe(false)
  })
})

function render() {
  return createChartRuntime<LikertCount | number, number, string>().render(
    likertDefinition(),
    { width: 640, height: 400 },
  )
}
