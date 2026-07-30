import { survey } from '@charts-poc/demo-data/survey'
import { describe, expect, it } from 'vitest'
import { agreementPercent, gaugeSegments } from './transform'

describe('survey gauge transform', () => {
  it('reduces raw responses to a complete bounded proportion', () => {
    const agreement = agreementPercent(survey, 'Q1')
    const segments = gaugeSegments(agreement)

    expect(agreement).toBe(39)
    expect(segments.reduce((total, segment) => total + segment.value, 0)).toBe(
      100,
    )
  })
})
