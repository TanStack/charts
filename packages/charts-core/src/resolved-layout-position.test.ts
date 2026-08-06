import { describe, expect, it } from 'vitest'
import {
  materializeLayoutXYRows,
  projectLayoutX,
  projectLayoutY,
} from './resolved-layout-position'
import type { ResolvedScale } from './types'

describe('resolved layout position projection', () => {
  it('materializes only complete positional pairs with original indexes', () => {
    const data = [{ id: 'a' }, { id: 'invalid-y' }, { id: 'invalid-x' }]

    expect(
      materializeLayoutXYRows(data, [1, 999, Number.NaN], [2, null, 3]),
    ).toEqual([
      {
        datum: data[0],
        sourceIndex: 0,
        xValue: 1,
        yValue: 2,
      },
    ])
  })

  it('composes axes while retaining source indexes and extra fields', () => {
    const rows = [
      { datum: { id: 'a' }, sourceIndex: 0, key: 'first' },
      { datum: { id: 'c' }, sourceIndex: 2, key: 'third' },
    ]
    const xScale = resolvedScale((value) => Number(value) * 10)
    const yScale = resolvedScale((value) => 100 - Number(value) * 5)
    const projected = projectLayoutY(
      projectLayoutX(rows, [1, null, 3], xScale),
      [2, null, 4],
      yScale,
    )

    expect(projected).toEqual([
      {
        datum: rows[0]!.datum,
        sourceIndex: 0,
        key: 'first',
        xValue: 1,
        x: 10,
        yValue: 2,
        y: 90,
      },
      {
        datum: rows[1]!.datum,
        sourceIndex: 2,
        key: 'third',
        xValue: 3,
        x: 30,
        yValue: 4,
        y: 80,
      },
    ])
  })

  it('omits invalid semantic values and nonfinite mapped positions', () => {
    const rows = [
      { datum: 'a', sourceIndex: 0 },
      { datum: 'b', sourceIndex: 1 },
      { datum: 'c', sourceIndex: 2 },
    ]
    const scale = resolvedScale((value) =>
      value === 3 ? Number.POSITIVE_INFINITY : Number(value),
    )

    expect(projectLayoutX(rows, [1, Number.NaN, 3], scale)).toEqual([
      { datum: 'a', sourceIndex: 0, xValue: 1, x: 1 },
    ])
  })
})

function resolvedScale(map: (value: unknown) => number): ResolvedScale {
  return {
    id: 'test',
    type: 'linear',
    domain: [],
    ticks: [],
    bandwidth: 0,
    map,
  }
}
