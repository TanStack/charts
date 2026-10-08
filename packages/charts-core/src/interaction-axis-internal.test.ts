import { describe, expect, it } from 'vitest'
import { createInteractionAxis } from './interaction-axis-internal'
import type { ResolvedScale } from './types'

describe('createInteractionAxis', () => {
  it('snaps to authored values and preserves their semantic order', () => {
    const values = ['low', 'middle', 'high'] as const
    const axis = createInteractionAxis({
      axis: 'x',
      scale: scale(
        (value) => values.indexOf(value as (typeof values)[number]) * 50,
      ),
      extent: [0, 100],
      sample: values[0],
      values,
    })

    expect(axis.valueAt(76)).toBe('high')
    expect(axis.order('high', 'low')).toEqual(['low', 'high'])
    expect(axis.step('middle', 1)).toBe('high')
    expect(axis.step('high', 1)).toBe('high')
  })

  it('supports reversed mapped positions without reversing authored order', () => {
    const values = [1, 2, 3] as const
    const axis = createInteractionAxis({
      axis: 'x',
      scale: scale((value) => 120 - Number(value) * 40),
      extent: [0, 100],
      sample: values[0],
      values,
    })

    expect(axis.positions).toEqual([80, 40, 0])
    expect(axis.valueAt(2)).toBe(3)
    expect(axis.order(3, 1)).toEqual([1, 3])
  })

  it('snaps to the nearest value like a linear search, preferring the lower index on ties', () => {
    // Unevenly spaced, so that some probes fall exactly between two values.
    const values = [0, 1, 3, 6, 10, 15, 21]
    for (const reverse of [false, true]) {
      const axis = createInteractionAxis({
        axis: 'x',
        scale: scale((value) => (reverse ? -Number(value) : Number(value))),
        extent: [-30, 30],
        sample: values[0]!,
        values,
      })
      const positions = axis.positions!
      for (let position = -25; position <= 25; position += 0.5) {
        const bounded = axis.clampPosition(position)
        let expected = 0
        for (const [index, candidate] of positions.entries()) {
          if (
            Math.abs(candidate - bounded) <
            Math.abs(positions[expected]! - bounded)
          ) {
            expected = index
          }
        }
        expect(axis.valueAt(position)).toBe(values[expected])
      }
      expect(axis.indexOf(15)).toBe(5)
      expect(axis.indexOf(2)).toBe(-1)
    }
  })

  it('clamps and inverts continuous dates using fresh Date values', () => {
    const start = new Date(Date.UTC(2024, 0, 1))
    const axis = createInteractionAxis({
      axis: 'x',
      scale: scale(
        (value) => ((value as Date).getTime() - start.getTime()) / 86_400_000,
        (position) => new Date(start.getTime() + position * 86_400_000),
      ),
      extent: [0, 10],
      sample: start,
    })

    const value = axis.valueAt(20)
    expect(value).toEqual(new Date(Date.UTC(2024, 0, 11)))
    expect(value).not.toBe(start)
    expect(axis.invert(20)).toEqual(new Date(Date.UTC(2024, 0, 21)))
  })

  it('looks up Date candidates by value and returns independent Date instances', () => {
    const values = [new Date(0), new Date(100), new Date(1000)]
    const axis = createInteractionAxis({
      axis: 'x',
      scale: scale(Number),
      extent: [0, 1000],
      sample: values[0]!,
      values,
    })
    expect(axis.indexOf(new Date(100))).toBe(1)
    expect(axis.indexOf(new Date(101))).toBe(-1)
    expect(axis.valueAt(550)).toEqual(values[1])
    expect(axis.valueAt(550)).not.toBe(values[1])
  })

  it('snaps every position to a singleton candidate', () => {
    const axis = createInteractionAxis({
      axis: 'x',
      scale: scale(Number),
      extent: [0, 100],
      sample: 50,
      values: [50],
    })
    for (const position of [-100, 0, 50, 100, 200])
      expect(axis.valueAt(position)).toBe(50)
    expect(axis.indexOf(50)).toBe(0)
    expect(axis.indexOf(51)).toBe(-1)
  })

  it('rejects ambiguous explicit candidate sets', () => {
    expect(() =>
      createInteractionAxis({
        axis: 'x',
        scale: scale(Number),
        extent: [0, 10],
        sample: 1,
        values: [],
      }),
    ).toThrow(/must not be empty/)
    expect(() =>
      createInteractionAxis({
        axis: 'x',
        scale: scale(Number),
        extent: [0, 10],
        sample: 1,
        values: [1, 1],
      }),
    ).toThrow(/must be unique/)
    expect(() =>
      createInteractionAxis({
        axis: 'x',
        scale: scale(Number),
        extent: [0, 10],
        sample: 1,
        values: [1, 3, 2],
      }),
    ).toThrow(/strictly monotone/)
  })

  it('requires candidates for strings and inversion for continuous values', () => {
    expect(() =>
      createInteractionAxis({
        axis: 'x',
        scale: scale(() => 0),
        extent: [0, 10],
        sample: 'a',
      }),
    ).toThrow(/requires explicit values/)
    expect(() =>
      createInteractionAxis({
        axis: 'x',
        scale: scale(Number),
        extent: [0, 10],
        sample: 1,
      }),
    ).toThrow(/requires an invertible scale/)
  })
})

function scale(
  map: (value: unknown) => number,
  invert?: (position: number) => number | Date,
): ResolvedScale {
  return {
    id: 'x',
    type: 'test',
    domain: [],
    map,
    ...(invert ? { invert } : {}),
    ticks: [],
    bandwidth: 0,
  }
}
