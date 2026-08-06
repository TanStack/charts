import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { hexbin } from './spatial-hexbin'

describe('spatial hexbin', () => {
  it('bins in final screen space with derived reducers and source lineage', () => {
    const rows = [
      { id: 'a', x: 0, y: 0, value: 2 },
      { id: 'b', x: 0.15, y: 0.1, value: 4 },
      { id: 'c', x: 10, y: 10, value: 8 },
      { id: 'invalid-x', x: Number.NaN, y: 5, value: 16 },
      { id: 'invalid-y', x: 999, y: null, value: 32 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const definition = defineChart({
      marks: [
        hexbin(rows, {
          x: 'x',
          y: 'y',
          binWidth: 60,
          outputs: {
            count: { reduce: 'count' },
            total: { value: 'value', reduce: 'sum' },
          },
          color: 'count',
          r: 10,
        }),
      ],
      guides: false,
      focusRing: false,
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
      color: {
        scale: scaleLinear<string>,
        range: ['#dbeafe', '#1d4ed8'],
      },
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })
    const repeated = createChartScene(definition, { width: 480, height: 260 })
    const indexes = scene.points
      .flatMap((point) => point.datum.sourceIndexes)
      .sort((left, right) => left - right)

    expectTypeOf(scene.points[0]!.datum.count).toEqualTypeOf<number>()
    expectTypeOf(scene.points[0]!.datum.total).toEqualTypeOf<number>()
    expect(scene.scales.x.domain).toEqual([0, 10])
    expect(scene.scales.y.domain).toEqual([0, 10])
    expect(scene.colors.domain).toEqual([1, 2])
    expect(indexes).toEqual([0, 1, 2])
    expect(scene.points.flatMap((point) => point.datum.source)).toEqual(
      expect.arrayContaining([rows[0], rows[1], rows[2]]),
    )
    for (const point of scene.points) {
      expect(point.datum.count).toBe(point.datum.source.length)
      expect(point.datum.total).toBe(
        point.datum.source.reduce((total, row) => total + row.value, 0),
      )
      expect(scene.scales.x.map(point.datum.x)).toBeCloseTo(point.x)
      expect(scene.scales.y.map(point.datum.y)).toBeCloseTo(point.y)
      expect(scene.scales.x.invert?.(point.x)).toBeCloseTo(point.datum.x)
      expect(scene.scales.y.invert?.(point.y)).toBeCloseTo(point.datum.y)
    }
    expect(repeated.points.map((point) => point.key)).toEqual(
      scene.points.map((point) => point.key),
    )
    expect(rows).toEqual(before)
  })

  it('recomputes membership from the final responsive plot width', () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: index,
      x: index * 10,
      y: 50,
    }))
    const definition = defineChart({
      marks: [hexbin(rows, { x: 'x', y: 'y', binWidth: 44 })],
      guides: false,
      focusRing: false,
      x: { scale: scaleLinear().domain([0, 100]) },
      y: { scale: scaleLinear().domain([0, 100]) },
    })
    const narrow = createChartScene(definition, { width: 220, height: 160 })
    const wide = createChartScene(definition, { width: 880, height: 160 })

    expect(narrow.points.length).toBeLessThan(wide.points.length)
    for (const scene of [narrow, wide]) {
      expect(
        scene.points
          .flatMap((point) => point.datum.sourceIndexes)
          .sort((left, right) => left - right),
      ).toEqual(rows.map((_row, index) => index))
    }
  })

  it('rejects invalid width, reserved outputs, and non-invertible scales', () => {
    const rows = [{ x: 0, y: 0 }]

    expect(() => hexbin(rows, { x: 'x', y: 'y', binWidth: 0 })).toThrow(
      'hexbin: binWidth must be a positive finite number',
    )
    expect(() =>
      hexbin(rows, {
        x: 'x',
        y: 'y',
        outputs: { x: { reduce: 'count' } },
      }),
    ).toThrow('hexbin: output name "x" is reserved')

    expect(() =>
      createChartScene(
        defineChart({
          marks: [hexbin(rows, { x: 'x', y: 'y' })],
          guides: false,
          x: { scale: scaleBand<number> },
          y: { scale: scaleLinear },
        }),
        { width: 320, height: 180 },
      ),
    ).toThrow('hexbin: x and y scales must support inversion')
  })
})
