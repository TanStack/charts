import { describe, expect, it } from 'vitest'
import { aapl } from '@charts-poc/demo-data/aapl'
import { survey } from '@charts-poc/demo-data/survey'
import { createDashboardData, surveyResponses } from './transforms'

describe('sandbox real-data transforms', () => {
  it('selects source observations without converting them to chart-shaped rows', () => {
    const data = createDashboardData('all')

    expect(data.aapl).toHaveLength(aapl.length)
    expect(data.aapl.at(-1)).toBe(aapl.at(-1))
    expect(data.aapl.at(-1)).toMatchObject({
      Date: expect.any(Date),
      Open: expect.any(Number),
      High: expect.any(Number),
      Low: expect.any(Number),
      Close: expect.any(Number),
      Volume: expect.any(Number),
    })
  })

  it('keeps time-range selection ordered and bounded by each source timeline', () => {
    const oneYear = createDashboardData('1y')
    const threeYears = createDashboardData('3y')
    const all = createDashboardData('all')

    expect(oneYear.aapl.length).toBeLessThan(threeYears.aapl.length)
    expect(threeYears.aapl.length).toBeLessThan(all.aapl.length)
    expect(
      oneYear.aapl.every(
        (row, index) =>
          index === 0 ||
          row.Date.getTime() >= oneYear.aapl[index - 1]!.Date.getTime(),
      ),
    ).toBe(true)
  })

  it('derives survey stacks and the agreement summary from the published rows', () => {
    const data = createDashboardData('all')
    const questionOne = survey.filter((row) => row.Question === 'Q1')
    const agreement = questionOne.filter(
      (row) => row.Response === 'Agree' || row.Response === 'Strongly Agree',
    ).length

    expect(data.surveyCells).toHaveLength(questionOne.length)
    expect(data.surveyResponseCounts.map((row) => row.Response)).toEqual(
      surveyResponses,
    )
    expect(
      data.surveyResponseCounts.reduce((sum, row) => sum + row.count, 0),
    ).toBe(questionOne.length)
    expect(data.agreementPercent).toBeCloseTo(
      (agreement / questionOne.length) * 100,
    )

    for (const question of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']) {
      const stack = data.surveyStack.filter((row) => row.Question === question)
      expect(stack.at(-1)?.y2).toBe(
        survey.filter((row) => row.Question === question).length,
      )
    }
  })
})
