import { scaleBand, scaleLinear, scaleTime } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dot } from './dot'
import { facet } from './facet'
import { createChartScene, defineChart, findNearestPoint } from './scene'
import { voronoi } from './spatial-voronoi'
import { voronoiCellPolygons } from './spatial-voronoi-internal'
import type { ChartMark, SceneNode } from './types'

describe('spatial Voronoi mark', () => {
  it('draws bounded cells from complete pairs without adding focus points', () => {
    const rows = [
      { id: 'a', x: 0, y: 0, category: 'A' },
      { id: 'b', x: 10, y: 0, category: 'B' },
      { id: 'c', x: 0, y: 10, category: 'A' },
      { id: 'invalid-y', x: 999, y: null, category: 'B' },
      { id: 'invalid-x', x: Number.NaN, y: 5, category: 'B' },
    ]
    const before = rows.map((row) => ({ ...row }))
    const fill = vi.fn(
      (
        row: (typeof rows)[number],
        _context: {
          index: number
          data: readonly (typeof rows)[number][]
        },
      ) => (row.category === 'A' ? '#2563eb' : '#0d9488'),
    )
    const motion = { delay: 10 }
    const mark = voronoi(rows, {
      x: 'x',
      y: 'y',
      key: 'id',
      color: 'category',
      fill,
      fillOpacity: 0.2,
      stroke: '#ffffff',
      motion,
    })
    const definition = defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      margin: 0,
      scales: {
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      },
    })
    const scene = createChartScene(definition, { width: 240, height: 180 })
    const repeated = createChartScene(definition, { width: 240, height: 180 })
    const areas = sceneAreas(scene.nodes)

    expect(mark.motion).toBe(motion)
    expect(scene.scales.x.domain).toEqual([0, 10])
    expect(scene.scales.y.domain).toEqual([0, 10])
    expect(scene.colors.domain).toEqual(['A', 'B'])
    expect(scene.points).toEqual([])
    expect(areas).toHaveLength(3)
    expect(areas.every((area) => area.path === undefined)).toBe(true)
    expect(areas.every((area) => area.interaction === undefined)).toBe(true)
    expect(areas.map((area) => area.key)).toEqual(
      sceneAreas(repeated.nodes).map((area) => area.key),
    )
    for (const area of areas) {
      expect(area.points.length).toBeGreaterThanOrEqual(3)
      for (const [x, y] of area.points) {
        expect(x).toBeGreaterThanOrEqual(scene.chart.x)
        expect(x).toBeLessThanOrEqual(scene.chart.x + scene.chart.width)
        expect(y).toBeGreaterThanOrEqual(scene.chart.y)
        expect(y).toBeLessThanOrEqual(scene.chart.y + scene.chart.height)
      }
    }
    expect(
      fill.mock.calls
        .slice(0, 3)
        .map((call) => call[1].index)
        .sort(),
    ).toEqual([0, 1, 2])
    expect(fill.mock.calls.every((call) => call[1].data === rows)).toBe(true)
    expect(rows).toEqual(before)
  })

  it('recomputes clipped cells from final responsive bounds', () => {
    const rows = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 2, y: 0 },
      { id: 'c', x: 0, y: 3 },
      { id: 'd', x: 3, y: 2 },
    ]
    const definition = defineChart({
      marks: [voronoi(rows, { x: 'x', y: 'y', key: 'id' })],
      guides: false,
      focusRing: false,
      margin: 0,
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 3]) },
      },
    })
    const narrow = createChartScene(definition, { width: 100, height: 200 })
    const wide = createChartScene(definition, { width: 400, height: 200 })

    expect(sceneAreas(narrow.nodes).map((area) => area.points)).not.toEqual(
      sceneAreas(wide.nodes).map((area) => area.points),
    )
    expect(totalArea(sceneAreas(narrow.nodes))).toBeCloseTo(
      narrow.chart.width * narrow.chart.height,
      6,
    )
    expect(totalArea(sceneAreas(wide.nodes))).toBeCloseTo(
      wide.chart.width * wide.chart.height,
      6,
    )
  })

  it('uses explicit z groups but does not infer topology groups from color', () => {
    const coincident = [
      { id: 'a', group: 'A', color: 'red', x: 0, y: 0 },
      { id: 'b', group: 'B', color: 'blue', x: 0, y: 0 },
    ]
    const render = (z: 'group' | undefined) =>
      createChartScene(
        defineChart({
          marks: [
            voronoi(coincident, {
              x: 'x',
              y: 'y',
              key: 'id',
              color: 'color',
              ...(z ? { z } : {}),
            }),
          ],
          guides: false,
          focusRing: false,
          margin: 0,
          scales: {
            x: { scale: scaleLinear },
            y: { scale: scaleLinear },
          },
        }),
        { width: 200, height: 120 },
      )

    const oneTopology = render(undefined)
    const grouped = render('group')

    expect(sceneAreas(oneTopology.nodes)).toHaveLength(1)
    expect(sceneAreas(grouped.nodes)).toHaveLength(2)
    expect(totalArea(sceneAreas(grouped.nodes))).toBeCloseTo(
      grouped.chart.width * grouped.chart.height * 2,
      6,
    )
    expect(grouped.colors.domain).toEqual(['red', 'blue'])
  })

  it('encodes group and datum identity without delimiter collisions', () => {
    const rows = [
      { id: 'c', group: 'a:string:b', x: 0, y: 0 },
      { id: 'b:string:c', group: 'a', x: 1, y: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          voronoi(rows, {
            x: 'x',
            y: 'y',
            z: 'group',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
      }),
      { width: 200, height: 120 },
    )
    const keys = sceneAreas(scene.nodes).map((area) => area.key)

    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
  })

  it('uses stable keys for cocircular and coincident source reorders', () => {
    const rows = [
      { id: 'd', x: 1, y: 1 },
      { id: 'b', x: 1, y: 0 },
      { id: 'duplicate-a', x: 0, y: 0 },
      { id: 'c', x: 0, y: 1 },
      { id: 'a', x: 0, y: 0 },
    ]
    const render = (source: typeof rows) =>
      createChartScene(
        defineChart({
          marks: [voronoi(source, { x: 'x', y: 'y', key: 'id' })],
          guides: false,
          focusRing: false,
          margin: 0,
          scales: {
            x: { scale: scaleLinear().domain([0, 1]) },
            y: { scale: scaleLinear().domain([0, 1]) },
          },
        }),
        { width: 200, height: 200 },
      )

    const original = areaMap(render(rows))
    const reordered = areaMap(render([...rows].reverse()))

    expect(reordered).toEqual(original)
    expect(
      [...original.keys()].some((key) => key.includes('duplicate-a')),
    ).toBe(false)
  })

  it('supports categorical x and temporal y without inversion', () => {
    const rows = [
      { id: 'a', x: 'A', y: new Date('2024-01-01T00:00:00Z') },
      { id: 'b', x: 'B', y: new Date('2024-01-02T00:00:00Z') },
      { id: 'c', x: 'C', y: new Date('2024-01-03T00:00:00Z') },
    ]
    const mark = voronoi(rows, { x: 'x', y: 'y', key: 'id' })
    expectTypeOf(mark).toMatchTypeOf<
      ChartMark<never, never, never, string, Date>
    >()

    const scene = createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scaleBand },
          y: { scale: scaleTime },
        },
      }),
      { width: 280, height: 180 },
    )

    expect(sceneAreas(scene.nodes)).toHaveLength(3)
  })

  it('leaves native nearest focus and keyboard points to the dot layer', () => {
    const rows = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 10 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          voronoi(rows, { x: 'x', y: 'y', key: 'id' }),
          dot(rows, { x: 'x', y: 'y', key: 'id' }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
      }),
      { width: 200, height: 120 },
    )

    expect(scene.points).toHaveLength(rows.length)
    expect(scene.points.every((point) => point.markId.startsWith('dot-'))).toBe(
      true,
    )
    expect(findNearestPoint(scene, 0, 120)?.datum).toBe(rows[0])
  })

  it('clips and resolves independently inside facet cells', () => {
    const rows = [
      { id: 'a', panel: 'A', x: 0, y: 0 },
      { id: 'b', panel: 'A', x: 1, y: 0 },
      { id: 'c', panel: 'A', x: 0, y: 1 },
      { id: 'd', panel: 'B', x: 0, y: 0 },
      { id: 'e', panel: 'B', x: 1, y: 0 },
      { id: 'f', panel: 'B', x: 0, y: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          facet(rows, {
            by: 'panel',
            columns: 2,
            gap: 0,
            label: false,
            axes: 'cell',
            chart: (cellRows) => ({
              marks: [voronoi(cellRows, { x: 'x', y: 'y', key: 'id' })],
              guides: false,
              scales: {
                x: { scale: scaleLinear },
                y: { scale: scaleLinear },
              },
            }),
          }),
        ],
        guides: false,
        scales: {
          x: null,
          y: null,
        },
      }),
      { width: 320, height: 180 },
    )
    const areas = sceneAreas(scene.nodes)

    expect(areas).toHaveLength(rows.length)
    expect(new Set(areas.map((area) => area.key)).size).toBe(rows.length)
    expect(scene.points).toEqual([])
  })
})

describe('Voronoi cell kernel', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 80 }

  it('handles empty, singleton, two-point, coincident, and collinear inputs', () => {
    expect(voronoiCellPolygons([], bounds)).toEqual([])
    expect(voronoiCellPolygons([{ x: 50, y: 40 }], bounds)[0]?.points).toEqual([
      [100, 0],
      [100, 80],
      [0, 80],
      [0, 0],
    ])
    expect(
      voronoiCellPolygons([{ x: 1e14, y: 1e14 }], {
        x: 4.6557452064,
        y: 51.5032787807,
        width: 760.6373838591,
        height: 1831.1433991976,
      }),
    ).toHaveLength(1)

    const split = voronoiCellPolygons(
      [
        { x: 25, y: 40 },
        { x: 75, y: 40 },
      ],
      bounds,
    )
    expect(split).toHaveLength(2)
    expect(totalPolygonArea(split.map((cell) => cell.points))).toBeCloseTo(8000)

    expect(
      voronoiCellPolygons(
        [
          { x: 50, y: 40 },
          { x: 50, y: 40 },
          { x: 50, y: 40 },
        ],
        bounds,
      ),
    ).toHaveLength(1)

    const collinear = voronoiCellPolygons(
      [
        { x: 20, y: 40 },
        { x: 50, y: 40 },
        { x: 80, y: 40 },
      ],
      bounds,
    )
    expect(collinear).toHaveLength(3)
    expect(totalPolygonArea(collinear.map((cell) => cell.points))).toBeCloseTo(
      8000,
      6,
    )
    expect(
      collinear.every((cell) =>
        cell.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
      ),
    ).toBe(true)
    expect(
      collinear.every((cell) => {
        const first = cell.points[0]
        const last = cell.points.at(-1)
        return first?.[0] !== last?.[0] || first?.[1] !== last?.[1]
      }),
    ).toBe(true)
  })

  it('rejects invalid bounds and omits nonpositive extents', () => {
    expect(() =>
      voronoiCellPolygons([{ x: 0, y: 0 }], {
        x: Number.NaN,
        y: 0,
        width: 1,
        height: 1,
      }),
    ).toThrow('chart bounds must be finite')
    expect(
      voronoiCellPolygons([{ x: 0, y: 0 }], {
        x: 0,
        y: 0,
        width: 0,
        height: 1,
      }),
    ).toEqual([])
    expect(() =>
      voronoiCellPolygons([{ x: Number.POSITIVE_INFINITY, y: 0 }], bounds),
    ).toThrow('site positions must be finite')
  })

  it('recovers exact micro-pixel near-collinear sites', () => {
    const clustered = [
      { x: 661.3236825574716, y: 33.60897451637769 },
      { x: 661.3236829460833, y: 33.608974516406974 },
      { x: 661.323683334695, y: 33.608974516394724 },
      { x: 661.3236848891421, y: 33.60897451639969 },
    ]
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    const cells = voronoiCellPolygons(clustered, largeBounds)

    expect(cells).toHaveLength(clustered.length)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      largeBounds.width * largeBounds.height,
      6,
    )
    expect(
      cells.every((cell) => stableTotalPolygonArea([cell.points]) > 0),
    ).toBe(true)
  })

  it('keeps close sites distinct when they divide a large visible region', () => {
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    const cells = voronoiCellPolygons(
      [
        { x: 500, y: 400 },
        { x: 500.0005, y: 400 },
      ],
      largeBounds,
    )

    expect(cells).toHaveLength(2)
    expect(cells.map((cell) => Math.abs(polygonArea(cell.points)))).toEqual([
      expect.closeTo(400_000.2, 6),
      expect.closeTo(399_999.8, 6),
    ])
  })

  it('keeps resolvable near-collinear sites complete', () => {
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    const positions = Array.from({ length: 10 }, (_, index) => ({
      x: 500 + index * 0.01,
      y: 400 + index * 1e-8,
    }))
    const cells = voronoiCellPolygons(positions, largeBounds)

    expect(cells).toHaveLength(positions.length)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      largeBounds.width * largeBounds.height,
      6,
    )
  })

  it('preserves microscopic and large translated plot coordinates', () => {
    const microscopic = { x: 0, y: 0, width: 1e-8, height: 1e-8 }
    const microscopicCells = voronoiCellPolygons(
      [
        { x: 2e-9, y: 3e-9 },
        { x: 8e-9, y: 7e-9 },
      ],
      microscopic,
    )
    expect(microscopicCells).toHaveLength(2)
    expect(
      totalPolygonArea(microscopicCells.map((cell) => cell.points)),
    ).toBeCloseTo(microscopic.width * microscopic.height, 22)

    const translated = {
      x: 1e15,
      y: 1e15,
      width: 100,
      height: 100,
    }
    const translatedCells = voronoiCellPolygons(
      [
        { x: 1e15 + 25, y: 1e15 + 25 },
        { x: 1e15 + 75, y: 1e15 + 75 },
      ],
      translated,
    )
    expect(translatedCells).toHaveLength(2)
    expect(
      stableTotalPolygonArea(translatedCells.map((cell) => cell.points)),
    ).toBeCloseTo(translated.width * translated.height, 6)

    expect(() =>
      voronoiCellPolygons([{ x: 1e15, y: 1e15 }], {
        x: 1e15,
        y: 1e15,
        width: 0.01,
        height: 0.01,
      }),
    ).toThrow('representable extents')

    expect(() =>
      voronoiCellPolygons(
        [
          { x: 1e15, y: 1e15 + 50 },
          { x: 1e15 + 0.125, y: 1e15 + 50 },
        ],
        translated,
      ),
    ).toThrow('cell boundaries are not representable')
  })

  it('rejects offscreen phantom ownership during recovery', () => {
    const positions = [
      { x: 1e9, y: 1e9 },
      { x: 1e9 + 100, y: 1e9 - 100 },
      { x: 1e9 - 100, y: 1e9 + 100 },
    ]
    const cells = voronoiCellPolygons(positions, bounds)

    expect(cells).toHaveLength(1)
    expect(cells[0]?.pointIndex).toBe(0)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      bounds.width * bounds.height,
      6,
    )
  })

  it('falls back when extreme offscreen coordinates damage adjacency', () => {
    const positions = [
      { x: -1e11 + 600, y: 1e11 + 200 },
      { x: 1e11 - 700, y: -1e11 + 700 },
      { x: 1e11 - 800, y: -1e11 + 400 },
      { x: 1e11 - 900, y: -1e11 },
      { x: 1e11 - 1000, y: 1e11 - 400 },
    ]
    const cells = voronoiCellPolygons(positions, bounds)

    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      bounds.width * bounds.height,
      6,
    )
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)
  })

  it('does not accept full-plot ownership from an offscreen centroid', () => {
    const positions = [
      { x: -99_999_999_576, y: -100_000_000_107 },
      { x: 100_000_000_721, y: 100_000_000_018 },
      { x: -99_999_999_674, y: -100_000_000_065 },
      { x: 100_000_000_850, y: 99_999_999_013 },
    ]
    const cells = voronoiCellPolygons(positions, bounds)

    expect(cells.length).toBeGreaterThan(1)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      bounds.width * bounds.height,
      6,
    )
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)
  })

  it('uses triangle adjacency when the neighbor iterator drops an edge', () => {
    const positions = [
      { x: -1_000_000_000_578.3121, y: -999_999_999_345.0317 },
      { x: -1_000_000_000_169.9282, y: 1_000_000_000_661.7872 },
      { x: -1_000_000_000_133.2104, y: 1_000_000_000_669.596 },
    ]
    const cells = voronoiCellPolygons(positions, bounds)

    expect(cells).toHaveLength(1)
    expect(cells[0]?.pointIndex).toBe(0)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      bounds.width * bounds.height,
      6,
    )
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)
  })

  it('keeps ordinary offscreen intersections numerically stable', () => {
    const positions = [
      { x: 651.037713, y: 191.366306 },
      { x: -544.443035, y: 191.586636 },
      { x: -856.531833, y: 935.9263 },
    ]
    const cells = voronoiCellPolygons(positions, bounds)

    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      bounds.width * bounds.height,
      6,
    )
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)

    const translatedBounds = {
      x: 171.55469241552055,
      y: 121.60653891041875,
      width: 1158.0075164022855,
      height: 141.01478030905128,
    }
    const translatedPositions = [
      { x: 1360.47680052668, y: 254.89428558231188 },
      { x: 1247.6446093880438, y: 272.0518463321528 },
    ]
    const translatedCells = voronoiCellPolygons(
      translatedPositions,
      translatedBounds,
    )
    expect(
      stableTotalPolygonArea(translatedCells.map((cell) => cell.points)),
    ).toBeCloseTo(translatedBounds.width * translatedBounds.height, 6)

    const farBounds = {
      x: 108.63115889951587,
      y: 126.98081121779978,
      width: 50.60134462080896,
      height: 42.93021799298003,
    }
    const farCells = voronoiCellPolygons(
      [
        { x: 1_082_928_512_434.4115, y: -450_833_110_890.283 },
        { x: 244_686_658_359.67847, y: 297_676_147_085.0409 },
      ],
      farBounds,
    )
    expect(farCells).toHaveLength(1)
    expect(farCells[0]?.pointIndex).toBe(1)
  })

  it('falls through to plot-centered recovery after normalized recovery fails', () => {
    const translatedBounds = {
      x: 13.420432107523084,
      y: 91.96736942976713,
      width: 1516.16731409356,
      height: 346.6275286152959,
    }
    const positions = [
      { x: -62_695_471_527.617455, y: 14_371_816_963.667881 },
      { x: 330_043_050_127.9324, y: 73_647_639_494.4066 },
    ]
    const cells = voronoiCellPolygons(positions, translatedBounds)

    expect(cells).toHaveLength(1)
    expect(cells[0]?.pointIndex).toBe(0)
    expect(
      stableTotalPolygonArea(cells.map((cell) => cell.points)),
    ).toBeCloseTo(translatedBounds.width * translatedBounds.height, 6)
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)
  })

  it('preserves valid exact cocircular partitions', () => {
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    for (let length = 3; length <= 128; length += 1) {
      const cocircular = Array.from({ length }, (_, index) => {
        const angle = (Math.PI * 2 * index) / length
        return {
          x: 500 + 100 * Math.cos(angle),
          y: 400 + 100 * Math.sin(angle),
        }
      })
      let cells
      try {
        cells = voronoiCellPolygons(cocircular, largeBounds)
      } catch (error) {
        throw new Error(`failed cocircular length ${length}`, { cause: error })
      }

      expect(cells).toHaveLength(cocircular.length)
      expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
        largeBounds.width * largeBounds.height,
        6,
      )
    }
  })

  it('omits offscreen cells that only touch the plot tangentially', () => {
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    const positions = Array.from({ length: 47 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 47
      return {
        x: 1000 + 100 * Math.cos(angle),
        y: 400 + 100 * Math.sin(angle),
      }
    })
    const cells = voronoiCellPolygons(positions, largeBounds)

    expect(cells.some((cell) => cell.pointIndex === 45)).toBe(false)
    expect(
      cells.every((cell) => stableTotalPolygonArea([cell.points]) > 0),
    ).toBe(true)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      largeBounds.width * largeBounds.height,
      6,
    )
  })

  it('validates high-degree cells with ordered support queries', () => {
    const largeBounds = { x: 0, y: 0, width: 1000, height: 800 }
    const positions = [
      { x: 500, y: 400 },
      ...Array.from({ length: 100 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 100
        return {
          x: 500 + 100 * Math.cos(angle),
          y: 400 + 100 * Math.sin(angle),
        }
      }),
    ]
    const cells = voronoiCellPolygons(positions, largeBounds)

    expect(cells).toHaveLength(positions.length)
    expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
      largeBounds.width * largeBounds.height,
      6,
    )
    expect(maximumOwnershipError(cells, positions)).toBeLessThan(1e-9)
  })

  it('partitions the bounds with finite open polygons across seeded inputs', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const random = seededRandom(seed)
      const positions = Array.from({ length: 12 }, (_, index) => {
        if (seed % 10 === 0) {
          return { x: index * 9, y: 40 }
        }
        if (index === 11 && seed % 4 === 0) {
          return { x: 50, y: 40 }
        }
        return { x: random() * 100, y: random() * 80 }
      })
      const cells = voronoiCellPolygons(positions, bounds)

      expect(totalPolygonArea(cells.map((cell) => cell.points))).toBeCloseTo(
        bounds.width * bounds.height,
        6,
      )
      for (const cell of cells) {
        const first = cell.points[0]!
        const last = cell.points.at(-1)!
        expect(first[0] !== last[0] || first[1] !== last[1]).toBe(true)
        for (const [x, y] of cell.points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(x).toBeGreaterThanOrEqual(bounds.x)
          expect(x).toBeLessThanOrEqual(bounds.x + bounds.width)
          expect(y).toBeGreaterThanOrEqual(bounds.y)
          expect(y).toBeLessThanOrEqual(bounds.y + bounds.height)
        }
      }
    }
  })
})

function sceneAreas(
  nodes: readonly SceneNode[],
): Extract<SceneNode, { kind: 'area' }>[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? sceneAreas(node.children)
      : node.kind === 'area'
        ? [node]
        : [],
  )
}

function areaMap(
  scene: ReturnType<typeof createChartScene>,
): Map<string, unknown> {
  return new Map(
    sceneAreas(scene.nodes).map((area) => [
      area.key,
      area.points.map(([x, y]) => [rounded(x), rounded(y)]),
    ]),
  )
}

function totalArea(areas: readonly Extract<SceneNode, { kind: 'area' }>[]) {
  return totalPolygonArea(areas.map((area) => area.points))
}

function totalPolygonArea(
  polygons: readonly (readonly (readonly [number, number])[])[],
): number {
  return polygons.reduce(
    (sum, points) => sum + Math.abs(polygonArea(points)),
    0,
  )
}

function stableTotalPolygonArea(
  polygons: readonly (readonly (readonly [number, number])[])[],
): number {
  return polygons.reduce((sum, points) => {
    const origin = points[0]
    if (!origin) return sum
    let area = 0
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index]!
      const next = points[index + 1]!
      area +=
        (current[0] - origin[0]) * (next[1] - origin[1]) -
        (current[1] - origin[1]) * (next[0] - origin[0])
    }
    return sum + Math.abs(area / 2)
  }, 0)
}

function maximumOwnershipError(
  cells: readonly {
    readonly pointIndex: number
    readonly points: readonly (readonly [number, number])[]
  }[],
  positions: readonly { readonly x: number; readonly y: number }[],
): number {
  let maximum = 0
  for (const cell of cells) {
    const site = positions[cell.pointIndex]!
    for (const point of cell.points) {
      for (const competitor of positions) {
        const xDelta = competitor.x - site.x
        const yDelta = competitor.y - site.y
        const length = Math.hypot(xDelta, yDelta)
        if (length === 0) continue
        const signedDistance =
          (point[0] - (site.x / 2 + competitor.x / 2)) * xDelta +
          (point[1] - (site.y / 2 + competitor.y / 2)) * yDelta
        maximum = Math.max(maximum, signedDistance / length)
      }
    }
  }
  return maximum
}

function polygonArea(points: readonly (readonly [number, number])[]): number {
  return (
    points.reduce((sum, current, index) => {
      const next = points[(index + 1) % points.length]!
      return sum + current[0] * next[1] - next[0] * current[1]
    }, 0) / 2
  )
}

function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}
