import { describe, expect, it } from 'vitest'
import {
  formatStackedCursorEndpoint,
  stackedCursorBandInset,
  stackedCursorBarInset,
  stackedCursorCauses,
  stackedCursorMaximum,
  stackedCursorOutset,
  stackedCursorPeriods,
  stackedCursorRowsForRevision,
} from './model'

describe('stacked cursor revisions', () => {
  it('uses a full-width cursor band with deterministic endpoint labels', () => {
    expect(stackedCursorBarInset).toBe(4)
    expect(stackedCursorOutset).toBe(4)
    expect(stackedCursorBandInset).toBe(0)
    expect(formatStackedCursorEndpoint(1_131)).toBe('1,131')
  })

  it('alternates visible values without changing category or point identity', () => {
    const initial = stackedCursorRowsForRevision(0)
    const revised = stackedCursorRowsForRevision(1)

    expect(stackedCursorPeriods).toHaveLength(8)
    expect(initial).toHaveLength(24)
    expect(revised).toHaveLength(24)
    expect(new Set(initial.map((row) => row.id)).size).toBe(24)
    expect(revised.map((row) => row.id)).toEqual(initial.map((row) => row.id))
    expect(revised.map((row) => row.deaths)).not.toEqual(
      initial.map((row) => row.deaths),
    )
    expect(initial.find((row) => row.id === 'Nov:wounds')?.end).toBe(1_131)
    expect(revised.find((row) => row.id === 'Nov:wounds')?.end).toBe(992)
    expect(stackedCursorRowsForRevision(2)).toBe(initial)
    expect(stackedCursorRowsForRevision(3)).toBe(revised)
  })

  it('recomputes every stack against one bounded y domain', () => {
    for (const revision of [0, 1]) {
      const rows = stackedCursorRowsForRevision(revision)

      for (const period of stackedCursorPeriods) {
        const stack = rows.filter((row) => row.period === period)
        expect(stack.map((row) => row.cause)).toEqual(stackedCursorCauses)
        expect(stack[0]?.start).toBe(0)

        for (let index = 0; index < stack.length; index += 1) {
          const row = stack[index]!
          expect(row.start).toBe(index === 0 ? 0 : stack[index - 1]!.end)
          expect(row.end).toBe(row.start + row.deaths)
          expect(row.end).toBeLessThanOrEqual(stackedCursorMaximum)
        }
      }
    }

    expect(stackedCursorMaximum).toBe(3_500)
  })
})
