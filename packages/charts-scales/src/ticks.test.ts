import {
  tickIncrement as d3TickIncrement,
  ticks as d3Ticks,
  tickStep as d3TickStep,
} from 'd3-array'
import { describe, expect, it } from 'vitest'
import { tickIncrement, ticks, tickStep } from './ticks'

const fixedCases = [
  [0, 10, 5],
  [10, 0, 5],
  [-1.2, 8.7, 5],
  [0.000_12, 0.000_89, 6],
  [-9e12, 4e12, 8],
  [0.1, 0.2, 1],
  [0, 1, 0.5],
  [0, 1, 1],
  [0, 1, 0],
  [0, 1, -1],
  [0, 1, Number.POSITIVE_INFINITY],
  [0, 0, 5],
  [Number.NaN, 1, 5],
  [0, Number.POSITIVE_INFINITY, 5],
  [Number.EPSILON, 1 - Number.EPSILON, 7],
] as const

describe('compact tick helpers', () => {
  it.each(fixedCases)(
    'matches D3 for %s..%s with count %s',
    (start, stop, count) => {
      expect(ticks(start, stop, count)).toEqual(d3Ticks(start, stop, count))
      expect(tickIncrement(start, stop, count)).toBe(
        d3TickIncrement(start, stop, count),
      )
      expect(tickStep(start, stop, count)).toBe(d3TickStep(start, stop, count))
    },
  )

  it('matches D3 across deterministic generated domains', () => {
    let state = 0x6d2b79f5
    const random = () => {
      state = Math.imul(state ^ (state >>> 15), state | 1)
      state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
      return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296
    }

    for (let index = 0; index < 2_000; index += 1) {
      const magnitude = 10 ** Math.floor(random() * 25 - 12)
      const first = (random() * 40 - 20) * magnitude
      const second = (random() * 40 - 20) * magnitude
      const count = random() < 0.1 ? random() * 2 : 2 + random() * 30

      expect(ticks(first, second, count)).toEqual(d3Ticks(first, second, count))
      expect(tickIncrement(first, second, count)).toBe(
        d3TickIncrement(first, second, count),
      )
      expect(tickStep(first, second, count)).toBe(
        d3TickStep(first, second, count),
      )
    }
  })
})
