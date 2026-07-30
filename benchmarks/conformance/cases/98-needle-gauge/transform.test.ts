import { describe, expect, it } from 'vitest'
import { gaugeBands, gaugeMaximum, gaugeTicks } from './transform'

describe('needle gauge transforms', () => {
  it('builds the unemployment threshold bands and display ticks', () => {
    expect(gaugeTicks.map((tick) => tick.value)).toEqual([
      0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30,
    ])
    expect(gaugeBands.reduce((total, band) => total + band.value, 0)).toBe(
      gaugeMaximum,
    )
  })
})
