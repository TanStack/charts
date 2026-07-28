import { describe, expect, it } from 'vitest'
import { createGridPointIndex } from './spatial'
import type { ChartPoint } from './types'

describe('grid point index', () => {
  it('finds the exact nearest point within a bounded neighborhood', () => {
    const points = [point('a', 10, 10), point('b', 42, 12), point('c', 98, 90)]
    const index = createGridPointIndex(points, { cellSize: 24 })

    expect(index.findNearest(39, 10, 20)?.key).toBe('b')
    expect(index.findNearest(70, 60, 12)).toBeNull()
    expect(index.findNearest(95, 92)?.key).toBe('c')
  })
})

function point(key: string, x: number, y: number): ChartPoint<string> {
  return {
    key,
    markId: 'points',
    group: null,
    groupLabel: 'points',
    datum: key,
    datumIndex: 0,
    xValue: x,
    yValue: y,
    x,
    y,
    color: 'currentColor',
  }
}
