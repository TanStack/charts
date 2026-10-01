import { describe, expect, it } from 'vitest'
import { nearestPoint } from './nearest'
import { gridSpatialIndex } from './spatial-grid-index'
import { createGridIndex } from './spatial-grid-index-internal'
import type { ChartPoint, ChartSpatialIndexFactory } from './types'

type Layout = (random: () => number, index: number) => readonly [number, number]

// Each layout stresses a different grid shape: uniform, ties on integer
// lattices, dense clusters with outliers, collinear points, and non-finite
// anchors that must stay outside the grid.
const layouts: Record<string, Layout> = {
  uniform: (random) => [random() * 800, random() * 400],
  lattice: (random) => [Math.floor(random() * 12), Math.floor(random() * 12)],
  clustered: (random, index) =>
    index % 50 === 0
      ? [random() * 1e5 - 5e4, random() * 1e5 - 5e4]
      : [300 + random() * 2, 200 + random() * 2],
  horizontal: (random) => [random() * 1_000, 42],
  vertical: (random) => [7, Math.floor(random() * 30)],
  verticalStrip: (random) => [480, random() * 540],
  thinStrip: (random) => [480 + random() * 2, random() * 540],
  single: () => [5, 5],
  nonFinite: (random, index) =>
    index % 7 === 0
      ? [[NaN, Infinity, -Infinity][index % 3]!, random() * 100]
      : [random() * 100, random() * 100],
}

// The factory must plug into the definition option without a wrapper.
gridSpatialIndex satisfies ChartSpatialIndexFactory<number>

describe('grid spatial index', () => {
  it.each([
    ['one column', (random: () => number) => [480, random() * 540] as const],
    ['one row', (random: () => number) => [random() * 960, 270] as const],
    [
      'a thin strip',
      (random: () => number) => [480 + random() * 2, random() * 540] as const,
    ],
  ])('keeps queries cheap on %s', (_name, layout) => {
    const random = seededRandom(31)
    const points = Array.from({ length: 10_000 }, (_, index) =>
      point(index, ...layout(random)),
    )
    const probe = { cells: 0 }
    const index = createGridIndex(points, probe)
    let queries = 0
    for (const maxDistance of [48, Infinity]) {
      for (let query = 0; query < 100; query += 1) {
        const x = random() * 1_000 - 20
        const y = random() * 580 - 20
        expect(index.findNearest(x, y, maxDistance)).toBe(
          nearestPoint(points, x, y, maxDistance),
        )
        queries += 1
      }
    }
    // A strip has thousands of cells. Before ring sweeps were clamped to the
    // grid and bounded by distance, these layouts averaged 878-6,973 cells.
    expect(probe.cells / queries).toBeLessThan(250)
  })

  it.each(Object.entries(layouts))(
    'matches the linear anchor scan for %s points',
    (_name, layout) => {
      for (let seed = 1; seed <= 12; seed += 1) {
        const random = seededRandom(seed * 7_919)
        const count = [0, 1, 2, 17, 300, 2_000][seed % 6]!
        const points = Array.from({ length: count }, (_, index) =>
          point(index, ...layout(random, index)),
        )
        const index = gridSpatialIndex(points)
        for (let query = 0; query < 200; query += 1) {
          const source = points[Math.floor(random() * count)]
          let x =
            query % 5 === 0 && source
              ? source.x
              : random() * 1_400 - 300 + (query % 11 === 0 ? 1e5 : 0)
          let y = query % 5 === 0 && source ? source.y : random() * 800 - 200
          if (query % 3 === 0) {
            // Half steps sit equidistant between lattice points in
            // neighboring cells, so ties cross cell boundaries.
            x = Math.round((x % 14) * 2) / 2
            y = Math.round((y % 14) * 2) / 2
          }
          const maxDistance = [Infinity, 0, 3, 48, 250, -1, NaN][query % 7]!
          expect(index.findNearest(x, y, maxDistance)).toBe(
            nearestPoint(points, x, y, maxDistance),
          )
        }
        expect(index.findNearest(NaN, 1)).toBe(
          nearestPoint(points, NaN, 1, Infinity),
        )
        expect(index.findNearest(Infinity, 1)).toBe(
          nearestPoint(points, Infinity, 1, Infinity),
        )
      }
    },
  )
})

function point(index: number, x: number, y: number): ChartPoint<number> {
  return {
    key: `point:${index}`,
    markId: 'points',
    group: null,
    groupLabel: 'points',
    datum: index,
    datumIndex: index,
    xValue: x,
    yValue: y,
    x,
    y,
    color: 'currentColor',
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}
