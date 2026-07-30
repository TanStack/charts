import { describe, expect, it } from 'vitest'
import { group, sum } from 'd3-array'
import { survey } from '@charts-poc/demo-data/survey'
import { mosaicLayout, mosaicResponses } from './layout'

describe('mosaicLayout', () => {
  it('counts every survey response and normalizes each question independently', () => {
    const layout = mosaicLayout(survey)
    const byQuestion = group(layout.cells, (cell) => cell.Question)

    expect(layout.cells).toHaveLength(25)
    expect(layout.labels.map((label) => label.Question)).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ])
    expect(sum(layout.cells, (cell) => cell.count)).toBe(survey.length)

    for (const cells of byQuestion.values()) {
      expect(cells.map((cell) => cell.Response)).toEqual(mosaicResponses)
      expect(cells[0]?.y1).toBe(0)
      expect(cells.at(-1)?.y2).toBeCloseTo(1)
    }
  })
})
