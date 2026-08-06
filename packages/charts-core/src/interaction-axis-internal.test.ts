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
