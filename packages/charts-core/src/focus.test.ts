import { describe, expect, it } from 'vitest'
import { focusNearestX, focusNearestY, focusGroupX, focusGroupY } from './focus'
import { focusDisabled } from './focus-disabled'
import type { ChartPoint } from './types'

const points: ChartPoint[] = [
  point('a', 10, 20, 'A', 1),
  point('b', 10, 80, 'B', 1),
  point('c', 60, 20, 'C', 2),
  point('d', 60, 80, 'D', 2),
]

describe('axis focus strategies', () => {
  it('selects one nearest point while prioritizing x distance', () => {
    const focused = focusNearestX.resolve(points, {
      x: 12,
      y: 70,
      maxDistance: 100,
    })

    expect(focused.map((candidate) => candidate.key)).toEqual(['b'])
    expect(focusNearestX.group(points, { point: focused[0]! })).toEqual(focused)
    expect(focusNearestX.navigation(points)).toEqual(points)
  })

  it('selects one nearest point while prioritizing y distance', () => {
    const focused = focusNearestY.resolve(points, {
      x: 55,
      y: 23,
      maxDistance: 100,
    })

    expect(focused.map((candidate) => candidate.key)).toEqual(['c'])
    expect(focusNearestY.group(points, { point: focused[0]! })).toEqual(focused)
  })

  it('retains grouped x and y focus as separate modes', () => {
    expect(
      focusGroupX
        .resolve(points, { x: 12, y: 70, maxDistance: 100 })
        .map((candidate) => candidate.key),
    ).toEqual(['b', 'a'])
    expect(
      focusGroupY
        .resolve(points, { x: 55, y: 23, maxDistance: 100 })
        .map((candidate) => candidate.key),
    ).toEqual(['c', 'a'])
  })

  it('keeps the focused point as the sole representative of its group', () => {
    const groupedPoints = [
      point('a-first', 10, 20, 'A', 1),
      point('a-focused', 10, 40, 'A', 1),
      point('b', 10, 60, 'B', 1),
    ]

    expect(
      focusGroupX
        .group(groupedPoints, { point: groupedPoints[1]! })
        .map((candidate) => candidate.key),
    ).toEqual(['a-focused', 'b'])
  })

  it('can disable native datum focus without a case-local strategy', () => {
    expect(
      focusDisabled.resolve(points, { x: 10, y: 20, maxDistance: 100 }),
    ).toEqual([])
    expect(focusDisabled.group(points, { point: points[0]! })).toEqual([])
    expect(focusDisabled.navigation(points)).toEqual([])
  })
})

function point(
  key: string,
  x: number,
  y: number,
  group: string,
  xValue: number,
): ChartPoint {
  return {
    color: 'currentColor',
    datum: null,
    datumIndex: 0,
    group,
    groupLabel: group,
    key,
    markId: 'test',
    x,
    xValue,
    y,
    yValue: y,
  }
}
