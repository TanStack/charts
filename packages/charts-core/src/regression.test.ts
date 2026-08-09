import { scaleLinear, scaleLog, scaleTime } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  linearRegressionRowsX,
  linearRegressionRowsY,
  linearRegressionX,
  linearRegressionY,
} from './regression'
import type {
  LinearRegressionRowsYOptions,
  LinearRegressionXDatum,
  LinearRegressionYDatum,
} from './regression'
import { createChartScene, defineChart } from './scene'
import type {
  ChartSpecDatum,
  ChartSpecXValue,
  SceneArea,
  SceneNode,
  ScenePolyline,
} from './types'

describe('linear regression marks', () => {
  it('exposes the same semantic samples used by the convenience marks', () => {
    const rows = [
      { group: 'A', x: 0, y: 1 },
      { group: 'B', x: 0, y: 6 },
      { group: 'A', x: 2, y: 5 },
      { group: 'B', x: 2, y: 2 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const options = {
      x: 'x',
      y: 'y',
      z: 'group',
      samples: 3,
    } satisfies LinearRegressionRowsYOptions<(typeof rows)[number]>
    const prepared = linearRegressionRowsY(rows, options)
    const scene = createChartScene(
      defineChart({
        marks: [
          linearRegressionY(rows, {
            x: 'x',
            y: 'y',
            z: 'group',
            samples: 3,
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expectTypeOf(prepared).toEqualTypeOf<
      LinearRegressionYDatum<(typeof rows)[number], number, string>[]
    >()
    expect(
      scene.points.map(({ datum }) => semanticRegressionYDatum(datum)),
    ).toEqual(prepared)
    expect(prepared.every((row) => !('markKey' in row))).toBe(true)
    expect(rows).toEqual(before)
    prepared.forEach((row) => {
      row.sourceIndexes.forEach((sourceIndex, index) => {
        expect(row.source[index]).toBe(rows[sourceIndex])
      })
    })
  })

  it('types temporal samples in both orientations through transform accessors', () => {
    interface TemporalRow {
      at: Date
      value: number
    }
    const epoch = 1_750_000_000_000
    const rows: TemporalRow[] = [
      { at: new Date(epoch), value: 10 },
      { at: new Date(epoch + 2), value: 14 },
    ]
    const preparedY = linearRegressionRowsY(rows, {
      x: (datum, { index, data }) => {
        expect(data[index]).toBe(datum)
        return datum.at
      },
      y: (datum) => datum.value,
      ci: 0,
      samples: 3,
    })
    const preparedX = linearRegressionRowsX(rows, {
      x: 'value',
      y: 'at',
      ci: 0,
      samples: 3,
    })
    const sceneX = createChartScene(
      defineChart({
        marks: [
          linearRegressionX(rows, {
            x: 'value',
            y: 'at',
            ci: 0,
            samples: 3,
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleTime },
      }),
      { width: 480, height: 280 },
    )

    expectTypeOf(preparedY).toEqualTypeOf<
      LinearRegressionYDatum<TemporalRow, Date, null>[]
    >()
    expectTypeOf(preparedX).toEqualTypeOf<
      LinearRegressionXDatum<TemporalRow, Date, null>[]
    >()
    expect(preparedY.map(({ x }) => x.getTime())).toEqual([
      epoch,
      epoch + 1,
      epoch + 2,
    ])
    expect(preparedX.map(({ y }) => y.getTime())).toEqual([
      epoch,
      epoch + 1,
      epoch + 2,
    ])
    expect(preparedX.map(({ x }) => x)).toEqual([10, 12, 14])
    expect(
      sceneX.points.map(({ datum }) => semanticRegressionXDatum(datum)),
    ).toEqual(preparedX)
  })

  it('omits invalid or degenerate groups and validates eager options', () => {
    const rows = [
      { group: 'valid', x: 1, y: 3 },
      { group: 'single', x: 2, y: 5 },
      { group: 'constant', x: 4, y: 1 },
      { group: 'valid', x: 3, y: 7 },
      { group: 'single', x: Number.NaN, y: 8 },
      { group: 'constant', x: 4, y: 9 },
      { group: 'valid', x: 5, y: Number.POSITIVE_INFINITY },
    ]
    const before = rows.map((row) => ({ ...row }))
    const prepared = linearRegressionRowsY(rows, {
      x: 'x',
      y: 'y',
      z: 'group',
      ci: 0,
      samples: 2,
    })

    expect(prepared.map(({ group }) => group)).toEqual(['valid', 'valid'])
    expect(prepared.map(({ sourceIndexes }) => sourceIndexes)).toEqual([
      [0, 3],
      [0, 3],
    ])
    expect(rows).toEqual(before)
    expect(() =>
      linearRegressionRowsY(rows, {
        x: 'x',
        y: 'y',
        samples: 1,
      }),
    ).toThrow('linearRegressionRowsY: samples must be an integer of at least 2')

    const mixed: { x: number | Date; y: number }[] = [
      { x: 1, y: 2 },
      { x: new Date(2), y: 3 },
    ]
    expect(() => linearRegressionRowsY(mixed, { x: 'x', y: 'y' })).toThrow(
      'linearRegressionRowsY: independent values must be uniformly numbers or Dates',
    )
  })

  it('fits raw rows, samples the semantic domain, and gives only the line interaction ownership', () => {
    const rows = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
      { x: 4, y: 5 },
    ]
    const definition = defineChart({
      marks: [
        linearRegressionY(rows, {
          id: 'fit',
          x: 'x',
          y: 'y',
          samples: 5,
          stroke: '#dc2626',
        }),
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 640, height: 360 })
    const nodes = flatten(scene.nodes)
    const area = nodes.find((node): node is SceneArea => node.kind === 'area')
    const line = nodes.find(
      (node): node is ScenePolyline => node.kind === 'polyline',
    )

    expect(scene.points).toHaveLength(5)
    expect(scene.points.map(({ xValue }) => xValue)).toEqual([0, 1, 2, 3, 4])
    const predicted = scene.points.map(({ yValue }) => yValue)
    const expectedPredicted = [0.6, 1.6, 2.6, 3.6, 4.6]
    expectedPredicted.forEach((expected, index) => {
      expect(scene.points[index]?.yValue).toBeCloseTo(expected)
    })
    expect(predicted).toHaveLength(5)
    expect(scene.points[2]?.datum.y1).toBeCloseTo(1.130091, 5)
    expect(scene.points[2]?.datum.y2).toBeCloseTo(4.069909, 5)
    expect(scene.points.every(({ markId }) => markId === 'fit:line')).toBe(true)
    for (const { datum } of scene.points) {
      expect(datum.sourceIndexes).toEqual([0, 1, 2, 3, 4])
      expect(datum.source).toEqual(rows)
      datum.source.forEach((source, index) => {
        expect(source).toBe(rows[index])
      })
      expect(datum.y1).toBeLessThan(datum.y)
      expect(datum.y2).toBeGreaterThan(datum.y)
      expect((datum.y1 ?? 0) + (datum.y2 ?? 0)).toBeCloseTo(datum.y * 2)
    }
    expect(area?.interaction).toBeUndefined()
    expect(area?.style?.fill).toBe('#dc2626')
    expect(area?.style?.fillOpacity).toBe(0.1)
    expect(line?.interaction?.points).toHaveLength(5)
    expect(line?.style?.stroke).toBe('#dc2626')
    expect(line?.style?.strokeWidth).toBe(1.5)
  })

  it('uses 64 semantic samples by default and suppresses the band with ci zero', () => {
    const rows = [
      { x: 1, y: 3 },
      { x: 4, y: 9 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [linearRegressionY(rows, { x: 'x', y: 'y', ci: 0 })],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expect(scene.points).toHaveLength(64)
    expect(scene.points[0]?.xValue).toBe(1)
    expect(scene.points.at(-1)?.xValue).toBe(4)
    expect(flatten(scene.nodes).some((node) => node.kind === 'area')).toBe(
      false,
    )
  })

  it('fits stable first-seen groups and limits aggregate lineage to valid observations', () => {
    const rows = [
      { id: 'a0', group: 'A', x: 1, y: 3 },
      { id: 'b0', group: 'B', x: 1, y: 9 },
      { id: 'invalid', group: 'A', x: null, y: 100 },
      { id: 'a1', group: 'A', x: 2, y: 5 },
      { id: 'b1', group: 'B', x: 2, y: 8 },
      { id: 'a2', group: 'A', x: 3, y: 7 },
      { id: 'b2', group: 'B', x: 3, y: 7 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const scene = createChartScene(
      defineChart({
        marks: [
          linearRegressionY(rows, {
            id: 'grouped',
            x: 'x',
            y: 'y',
            z: 'group',
            samples: 3,
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expect(scene.colors.domain).toEqual(['A', 'B'])
    expect(scene.points.map(({ group }) => group)).toEqual([
      'A',
      'A',
      'A',
      'B',
      'B',
      'B',
    ])
    expect(scene.points.map(({ yValue }) => yValue)).toEqual([3, 5, 7, 9, 8, 7])
    expect(
      scene.points.slice(0, 3).map(({ datum }) => datum.sourceIndexes),
    ).toEqual([
      [0, 3, 5],
      [0, 3, 5],
      [0, 3, 5],
    ])
    expect(
      scene.points.slice(3).map(({ datum }) => datum.sourceIndexes),
    ).toEqual([
      [1, 4, 6],
      [1, 4, 6],
      [1, 4, 6],
    ])
    const nodes = flatten(scene.nodes)
    const fills = nodes.flatMap((node) =>
      node.kind === 'area' ? [node.style?.fill] : [],
    )
    const strokes = nodes.flatMap((node) =>
      node.kind === 'polyline' ? [node.style?.stroke] : [],
    )
    expect(fills).toEqual(strokes)
    expect(fills).toHaveLength(2)
    expect(rows).toEqual(before)
  })

  it('keeps two-point fits but emits no band without residual degrees of freedom', () => {
    const rows = [
      { x: 1, y: 3 },
      { x: 4, y: 9 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [linearRegressionY(rows, { x: 'x', y: 'y', samples: 2 })],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expect(scene.points.map(({ xValue, yValue }) => [xValue, yValue])).toEqual([
      [1, 3],
      [4, 9],
    ])
    expect(flatten(scene.nodes).some((node) => node.kind === 'area')).toBe(
      false,
    )
  })

  it('omits groups with fewer than two valid observations or no independent variance', () => {
    const rows = [
      { group: 'valid', x: 1, y: 3 },
      { group: 'single', x: 2, y: 5 },
      { group: 'constant', x: 4, y: 1 },
      { group: 'valid', x: 3, y: 7 },
      { group: 'single', x: Number.NaN, y: 8 },
      { group: 'constant', x: 4, y: 9 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          linearRegressionY(rows, {
            x: 'x',
            y: 'y',
            z: 'group',
            ci: 0,
            samples: 2,
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expect(scene.points.map(({ group }) => group)).toEqual(['valid', 'valid'])
    expect(scene.points.map(({ datum }) => datum.sourceIndexes)).toEqual([
      [0, 3],
      [0, 3],
    ])
  })

  it('centers Date milliseconds before fitting and preserves Date point types', () => {
    const epoch = 1_750_000_000_000
    const rows = [
      { at: new Date(epoch), value: 10 },
      { at: new Date(epoch + 1), value: 12 },
      { at: new Date(epoch + 2), value: 14 },
    ]
    const definition = defineChart({
      marks: [
        linearRegressionY(rows, {
          x: 'at',
          y: 'value',
          ci: 0,
          samples: 3,
        }),
      ],
      x: { scale: scaleTime },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    type Datum = ChartSpecDatum<typeof definition>
    type XValue = ChartSpecXValue<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<
      LinearRegressionYDatum<(typeof rows)[number], Date>
    >()
    expectTypeOf<XValue>().toEqualTypeOf<Date>()
    expect(
      scene.points.map(({ xValue }) => (xValue as Date).getTime()),
    ).toEqual([epoch, epoch + 1, epoch + 2])
    expect(scene.points.map(({ yValue }) => yValue)).toEqual([10, 12, 14])
  })

  it('keeps a nonlinear independent scale faithful with intermediate semantic vertices', () => {
    const rows = [
      { x: 1, y: 1 },
      { x: 1_000, y: 1_000 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          linearRegressionY(rows, {
            x: 'x',
            y: 'y',
            ci: 0,
            samples: 5,
          }),
        ],
        x: { scale: scaleLog },
        y: { scale: scaleLinear },
      }),
      { width: 600, height: 320 },
    )
    const line = flatten(scene.nodes).find(
      (node): node is ScenePolyline => node.kind === 'polyline',
    )
    const points = line?.points ?? []

    expect(scene.points.map(({ xValue }) => xValue)).toEqual([
      1, 250.75, 500.5, 750.25, 1_000,
    ])
    expect(points).toHaveLength(5)
    expect(points[2]?.[0]).not.toBeCloseTo(
      ((points[0]?.[0] ?? 0) + (points[4]?.[0] ?? 0)) / 2,
    )
  })

  it('transposes the fit and confidence interval through areaX and lineX', () => {
    const rows = [
      { x: 8, y: 1 },
      { x: 6, y: 2 },
      { x: 4, y: 3 },
    ]
    const definition = defineChart({
      marks: [
        linearRegressionX(rows, {
          id: 'horizontal',
          x: 'x',
          y: 'y',
          samples: 3,
        }),
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    type Datum = ChartSpecDatum<typeof definition>
    const nodes = flatten(scene.nodes)
    const area = nodes.find((node): node is SceneArea => node.kind === 'area')
    const line = nodes.find(
      (node): node is ScenePolyline => node.kind === 'polyline',
    )

    expectTypeOf<Datum>().toEqualTypeOf<
      LinearRegressionXDatum<(typeof rows)[number], number>
    >()
    expect(scene.points.map(({ xValue, yValue }) => [xValue, yValue])).toEqual([
      [8, 1],
      [6, 2],
      [4, 3],
    ])
    expect(
      scene.points.every(({ markId }) => markId === 'horizontal:line'),
    ).toBe(true)
    expect(scene.points.every(({ datum }) => datum.x1 === datum.x2)).toBe(true)
    expect(area?.interaction).toBeUndefined()
    expect(line?.interaction?.affinity).toBe('y')
  })

  it('passes derived regression samples through composite motion', () => {
    const rows = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]
    const seen: LinearRegressionYDatum<(typeof rows)[number], number>[] = []
    const mark = linearRegressionY(rows, {
      x: 'x',
      y: 'y',
      ci: 0,
      samples: 3,
      motion: ({ datum }) => {
        expectTypeOf(datum).toEqualTypeOf<
          LinearRegressionYDatum<(typeof rows)[number], number> | undefined
        >()
        if (datum) seen.push(datum)
        return { delay: 1 }
      },
    })
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )
    const motion = mark.initialize({ markIndex: 0 }).motion

    expect(typeof motion).toBe('function')
    if (typeof motion !== 'function') return
    scene.points.forEach((point, datumIndex) => {
      motion({
        phase: 'update',
        role: 'line',
        key: point.key,
        markId: point.markId,
        seriesKey: point.markId,
        seriesIndex: 0,
        datumIndex,
        datumCount: scene.points.length,
        datum: point.datum,
        point,
      })
    })
    expect(seen).toHaveLength(3)
    expect(seen.every(({ source }) => source.length === 3)).toBe(true)
  })

  it('validates confidence, sampling, and independent value kind at initialization', () => {
    const rows = [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ]
    expect(() =>
      linearRegressionY(rows, { x: 'x', y: 'y', ci: 1 }).initialize({
        markIndex: 0,
      }),
    ).toThrow('ci must be a finite number in [0, 1)')
    expect(() =>
      linearRegressionY(rows, { x: 'x', y: 'y', samples: 1 }).initialize({
        markIndex: 0,
      }),
    ).toThrow('samples must be an integer of at least 2')

    const mixed: { x: number | Date; y: number }[] = [
      { x: 1, y: 2 },
      { x: new Date(2), y: 3 },
    ]
    expect(() =>
      linearRegressionY(mixed, { x: 'x', y: 'y' }).initialize({ markIndex: 0 }),
    ).toThrow('independent values must be uniformly numbers or Dates')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function semanticRegressionYDatum<TDatum, TXValue extends number | Date>(
  datum: LinearRegressionYDatum<TDatum, TXValue>,
): LinearRegressionYDatum<TDatum, TXValue> {
  return {
    x: datum.x,
    y: datum.y,
    ...(datum.y1 === undefined ? {} : { y1: datum.y1 }),
    ...(datum.y2 === undefined ? {} : { y2: datum.y2 }),
    group: datum.group,
    source: datum.source,
    sourceIndexes: datum.sourceIndexes,
  }
}

function semanticRegressionXDatum<TDatum, TYValue extends number | Date>(
  datum: LinearRegressionXDatum<TDatum, TYValue>,
): LinearRegressionXDatum<TDatum, TYValue> {
  return {
    x: datum.x,
    ...(datum.x1 === undefined ? {} : { x1: datum.x1 }),
    ...(datum.x2 === undefined ? {} : { x2: datum.x2 }),
    y: datum.y,
    group: datum.group,
    source: datum.source,
    sourceIndexes: datum.sourceIndexes,
  }
}
