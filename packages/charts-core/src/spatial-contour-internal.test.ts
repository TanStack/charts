import { describe, expect, it } from 'vitest'
import {
  identifyContourLevels,
  mapContourPolygons,
  normalizeContourThresholds,
} from './spatial-contour-internal'

describe('contour level identity', () => {
  it('normalizes shared threshold input without mutating exact levels', () => {
    const levels = [4, 2, 4]

    expect(normalizeContourThresholds(undefined, 7, 'contour')).toBe(7)
    expect(normalizeContourThresholds(3, 7, 'contour')).toBe(3)
    expect(normalizeContourThresholds(levels, 7, 'contour')).toEqual([2, 4, 4])
    expect(levels).toEqual([4, 2, 4])
    expect(() => normalizeContourThresholds(0, 7, 'contour')).toThrow(
      'contour: threshold count must be a positive integer',
    )
    expect(() =>
      normalizeContourThresholds([Number.NaN], 7, 'densityContour'),
    ).toThrow('densityContour: thresholds must be finite numbers')
  })

  it('distinguishes repeated explicit values', () => {
    expect(identifyContourLevels([2, 4, 4, 10], { kind: 'explicit' })).toEqual([
      { value: 2, identity: ['explicit', 2, 0] },
      { value: 4, identity: ['explicit', 4, 0] },
      { value: 4, identity: ['explicit', 4, 1] },
      { value: 10, identity: ['explicit', 10, 0] },
    ])
  })

  it('keys generated levels by requested count and ordinal', () => {
    const base = identifyContourLevels([0, 2, 4, 6], {
      kind: 'generated',
      count: 4,
    })
    const changed = identifyContourLevels([0, 20, 40, 60], {
      kind: 'generated',
      count: 4,
    })
    const differentCount = identifyContourLevels([0, 2, 4, 6], {
      kind: 'generated',
      count: 5,
    })

    expect(base.map(({ identity }) => identity)).toEqual(
      changed.map(({ identity }) => identity),
    )
    expect(base.map(({ identity }) => identity)).not.toEqual(
      differentCount.map(({ identity }) => identity),
    )
    expect([base[0], base[2]].map(({ identity }) => identity)).toEqual([
      ['generated', 4, 0],
      ['generated', 4, 2],
    ])
  })
})

describe('structured contour geometry', () => {
  it('preserves disconnected polygons and holes through projection', () => {
    const polygons = mapContourPolygons(
      [
        [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ],
          [
            [1, 1],
            [2, 1],
            [2, 2],
            [1, 2],
            [1, 1],
          ],
        ],
        [
          [
            [8, 0],
            [10, 0],
            [10, 2],
            [8, 2],
            [8, 0],
          ],
        ],
      ],
      (x, y) => [x * 2, 20 - y * 2],
    )

    expect(polygons).toEqual([
      [
        [
          [0, 20],
          [8, 20],
          [8, 12],
          [0, 12],
        ],
        [
          [2, 18],
          [4, 18],
          [4, 16],
          [2, 16],
        ],
      ],
      [
        [
          [16, 20],
          [20, 20],
          [20, 16],
          [16, 16],
        ],
      ],
    ])
  })

  it('rejects malformed rings instead of changing their topology', () => {
    expect(() =>
      mapContourPolygons([
        [
          [
            [0, 0],
            [1, 0],
            [Number.NaN, 1],
          ],
        ],
      ]),
    ).toThrow('finite two-dimensional points')
    expect(() =>
      mapContourPolygons([
        [
          [
            [0, 0],
            [1, 0],
          ],
        ],
      ]),
    ).toThrow('at least three points')
  })
})
