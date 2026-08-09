import { scaleBand, scaleLinear } from 'd3-scale'
import { morley } from '@charts-poc/demo-data/morley'
import type { MorleyRow } from '@charts-poc/demo-data/morley'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { boxRows, boxX, boxY } from './box'
import type { BoxDatum, BoxSummaryDatum } from './box'
import { createChartScene, defineChart } from './scene'
import type { ChartSpecDatum, SceneNode, SceneRect } from './types'

describe('box marks', () => {
  it('exposes the same semantic rows used by the convenience mark', () => {
    const rows = [
      { id: 'a', group: 'A', value: 0 },
      { id: 'b', group: 'A', value: 0 },
      { id: 'c', group: 'A', value: 0 },
      { id: 'd', group: 'A', value: 0 },
      { id: 'e', group: 'A', value: 10 },
      { id: 'f', group: 'B', value: 4 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const prepared = boxRows(rows, {
      category: 'group',
      value: 'value',
    })
    const scene = createChartScene(
      defineChart({
        marks: [boxY(rows, { x: 'group', y: 'value', key: 'id' })],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )

    expect(scene.points.map(({ datum }) => semanticBoxDatum(datum))).toEqual(
      prepared,
    )
    expect(prepared.every((row) => !('markKey' in row))).toBe(true)
    expect(rows).toEqual(before)
    prepared.forEach((row) => {
      row.sourceIndexes.forEach((sourceIndex, index) => {
        expect(row.source[index]).toBe(rows[sourceIndex])
      })
    })
  })

  it('uses transform accessors and omits invalid categories and observations', () => {
    interface Row {
      group: 'A' | 'B' | null
      value: number | null
    }
    const rows: Row[] = [
      { group: 'A', value: 1 },
      { group: 'A', value: 3 },
      { group: 'B', value: Number.NaN },
      { group: 'B', value: null },
      { group: null, value: 5 },
    ]
    const prepared = boxRows(rows, {
      category: (datum, { index, data }) => {
        expect(data[index]).toBe(datum)
        return datum.group
      },
      value: (datum) => datum.value,
    })

    expectTypeOf(prepared).toEqualTypeOf<BoxDatum<Row, 'A' | 'B'>[]>()
    expect(prepared).toHaveLength(1)
    expect(prepared[0]).toMatchObject({
      kind: 'summary',
      category: 'A',
      count: 2,
      sourceIndexes: [0, 1],
    })
  })

  it('summarizes Morley rows once with exact Tukey statistics and lineage', () => {
    const definition = defineChart({
      marks: [
        boxY(morley, {
          id: 'morley',
          x: 'Expt',
          y: 'Speed',
          key: 'Run',
          fill: '#bfdbfe',
          stroke: '#2563eb',
        }),
      ],
      x: { scale: scaleBand<number> },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 640, height: 400 })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<BoxDatum<MorleyRow, number>>()
    expect(scene.points).toHaveLength(11)
    expect(scene.colors.domain).toEqual([])
    const summaries = scene.points.filter(
      (point): point is typeof point & { datum: BoxSummaryDatum<MorleyRow> } =>
        point.datum.kind === 'summary',
    )
    const outliers = scene.points.filter(
      ({ datum }) => datum.kind === 'outlier',
    )

    expect(summaries.every(({ markId }) => markId === 'morley:box')).toBe(true)
    expect(outliers.every(({ markId }) => markId === 'morley:outlier')).toBe(
      true,
    )

    expect(summaries.map(({ datum }) => summaryValues(datum))).toEqual([
      [1, 850, 940, 980, 740, 1070],
      [2, 800, 845, 885, 760, 960],
      [3, 840, 855, 880, 840, 910],
      [4, 767.5, 815, 865, 720, 920],
      [5, 807.5, 810, 870, 740, 950],
    ])
    expect(
      outliers.map(({ datum }) =>
        datum.kind === 'outlier' ? [datum.category, datum.value] : null,
      ),
    ).toEqual([
      [1, 650],
      [3, 720],
      [3, 720],
      [3, 620],
      [3, 970],
      [3, 950],
    ])

    for (const { datum, yValue } of summaries) {
      expect(yValue).toBe(datum.median)
      expect(datum.source).toHaveLength(20)
      datum.sourceIndexes.forEach((sourceIndex, index) => {
        expect(datum.source[index]).toBe(morley[sourceIndex])
        expect(datum.source[index]?.Expt).toBe(datum.category)
      })
    }
    for (const { datum } of outliers) {
      if (datum.kind !== 'outlier') continue
      expect(datum.source).toHaveLength(1)
      expect(datum.source[0]).toBe(morley[datum.sourceIndexes[0]])
    }
  })

  it('emits one summary target plus raw-linked outliers over native children', () => {
    const scene = renderMorley()
    const nodes = flatten(scene.nodes)
    const boxes = nodes.filter(
      (node): node is SceneRect => node.kind === 'rect',
    )
    const summaryPoints = scene.points.filter(
      ({ datum }) => datum.kind === 'summary',
    )

    expect(boxes).toHaveLength(5)
    expect(
      nodes.filter(
        (node) => node.kind === 'rule' && node.key.includes('morley:whisker:'),
      ),
    ).toHaveLength(5)
    expect(
      nodes.filter(
        (node) => node.kind === 'rule' && node.key.includes('morley:median:'),
      ),
    ).toHaveLength(5)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'rule' &&
          (node.key.includes('morley:whisker:') ||
            node.key.includes('morley:median:')) &&
          node.interaction !== undefined,
      ),
    ).toHaveLength(0)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'dot' &&
          node.interaction?.point?.markId === 'morley:outlier',
      ),
    ).toHaveLength(6)
    expect(summaryPoints).toHaveLength(5)

    for (const box of boxes) {
      const point = box.interaction?.point
      expect((point?.datum as BoxDatum<MorleyRow> | undefined)?.kind).toBe(
        'summary',
      )
      expect(point).toBe(
        summaryPoints.find(({ datum }) => datum === point?.datum),
      )
    }
  })

  it('handles singleton, two-value, zero-IQR, boundary, and invalid groups', () => {
    const rows = [
      { id: 'a', group: 'single', value: 5 },
      { id: 'b0', group: 'pair', value: 0 },
      { id: 'b1', group: 'pair', value: 1 },
      { id: 'c0', group: 'constant', value: 0 },
      { id: 'c1', group: 'constant', value: 0 },
      { id: 'c2', group: 'constant', value: 0 },
      { id: 'c3', group: 'constant', value: 0 },
      { id: 'c4', group: 'constant', value: 10 },
      { id: 'd0', group: 'boundary', value: 0 },
      { id: 'd1', group: 'boundary', value: 1 },
      { id: 'd2', group: 'boundary', value: 2 },
      { id: 'd3', group: 'boundary', value: 3 },
      { id: 'd4', group: 'boundary', value: 6 },
      { id: 'e0', group: 'invalid', value: Number.NaN },
      { id: 'e1', group: 'invalid', value: Number.POSITIVE_INFINITY },
      { id: 'f', group: null, value: 3 },
    ] as const
    const original = [...rows]
    const definition = defineChart({
      marks: [boxY(rows, { x: 'group', y: 'value', key: 'id' })],
      x: { scale: scaleBand<string> },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 600, height: 360 })
    const summaries = scene.points.flatMap(({ datum }) =>
      datum.kind === 'summary' ? [datum] : [],
    )
    const outliers = scene.points.flatMap(({ datum }) =>
      datum.kind === 'outlier' ? [datum] : [],
    )

    expect(rows).toEqual(original)
    expect(summaries.map((datum) => summaryValues(datum))).toEqual([
      ['single', 5, 5, 5, 5, 5],
      ['pair', 0.25, 0.5, 0.75, 0, 1],
      ['constant', 0, 0, 0, 0, 0],
      ['boundary', 1, 2, 3, 0, 6],
    ])
    expect(outliers.map(({ category, value }) => [category, value])).toEqual([
      ['constant', 10],
    ])
  })

  it('transposes the same summary and interaction semantics horizontally', () => {
    const rows = [
      { id: 'a', group: 'A', value: 1 },
      { id: 'b', group: 'A', value: 2 },
      { id: 'c', group: 'A', value: 3 },
      { id: 'd', group: 'B', value: 8 },
    ]
    const definition = defineChart({
      marks: [boxX(rows, { id: 'horizontal', x: 'value', y: 'group' })],
      x: { scale: scaleLinear },
      y: { scale: scaleBand<string> },
    })
    const scene = createChartScene(definition, { width: 600, height: 360 })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<
      BoxDatum<(typeof rows)[number], string>
    >()
    const summaries = scene.points.filter(
      ({ datum }) => datum.kind === 'summary',
    )
    expect(summaries).toHaveLength(2)
    summaries.forEach((point) => {
      if (point.datum.kind !== 'summary') return
      expect(point.xValue).toBe(point.datum.median)
      expect(point.yValue).toBe(point.datum.category)
    })
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'rect'),
    ).toHaveLength(2)
  })

  it('preserves global raw order for interleaved outliers', () => {
    const rows = [
      { id: 'a0', group: 'A', value: 0 },
      { id: 'b0', group: 'B', value: 0 },
      { id: 'b1', group: 'B', value: 0 },
      { id: 'b2', group: 'B', value: 0 },
      { id: 'b3', group: 'B', value: 0 },
      { id: 'b4', group: 'B', value: 0 },
      { id: 'b5', group: 'B', value: 10 },
      { id: 'a1', group: 'A', value: 0 },
      { id: 'a2', group: 'A', value: 0 },
      { id: 'a3', group: 'A', value: 0 },
      { id: 'a4', group: 'A', value: 0 },
      { id: 'a5', group: 'A', value: 10 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [boxY(rows, { x: 'group', y: 'value', key: 'id' })],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 600, height: 360 },
    )

    expect(
      scene.points.flatMap(({ datum }) =>
        datum.kind === 'outlier' ? [datum.sourceIndexes[0]] : [],
      ),
    ).toEqual([6, 11])
  })

  it('recomputes summaries when one definition is initialized again', () => {
    const rows = [
      { id: 'a', group: 'A', value: 1 },
      { id: 'b', group: 'A', value: 2 },
      { id: 'c', group: 'A', value: 3 },
      { id: 'd', group: 'A', value: 4 },
    ]
    const mark = boxY(rows, { x: 'group', y: 'value', key: 'id' })
    const definition = defineChart({
      marks: [mark],
      x: { scale: scaleBand<string> },
      y: { scale: scaleLinear },
    })
    const median = () =>
      createChartScene(definition, { width: 480, height: 280 }).points.find(
        ({ datum }) => datum.kind === 'summary',
      )?.yValue

    expect(median()).toBe(2.5)
    rows[0]!.value = 100
    expect(median()).toBe(3.5)
    expect(mark.initialize({ markIndex: 4 }).id).toBe('box-y-4')
  })

  it('passes derived summary and outlier data to parent motion', () => {
    const rows = [
      { id: 'a', group: 'A', value: 0 },
      { id: 'b', group: 'A', value: 0 },
      { id: 'c', group: 'A', value: 0 },
      { id: 'd', group: 'A', value: 0 },
      { id: 'e', group: 'A', value: 10 },
    ]
    const seen: BoxDatum<(typeof rows)[number]>[] = []
    const mark = boxY(rows, {
      x: 'group',
      y: 'value',
      key: 'id',
      motion: ({ datum }) => {
        expectTypeOf(datum).toEqualTypeOf<
          BoxDatum<(typeof rows)[number], string> | undefined
        >()
        if (datum) seen.push(datum)
        return { delay: 1 }
      },
    })
    const definition = defineChart({
      marks: [mark],
      x: { scale: scaleBand<string> },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    const motion = mark.initialize({ markIndex: 0 }).motion

    expect(typeof motion).toBe('function')
    if (typeof motion !== 'function') return
    scene.points.forEach((point, datumIndex) => {
      motion({
        phase: 'update',
        role: point.datum.kind === 'summary' ? 'rect' : 'dot',
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

    expect(seen.map(({ kind }) => kind)).toEqual(['summary', 'outlier'])
  })
})

function renderMorley() {
  const definition = defineChart({
    marks: [
      boxY(morley, {
        id: 'morley',
        x: 'Expt',
        y: 'Speed',
        key: 'Run',
        fill: '#bfdbfe',
        stroke: '#2563eb',
      }),
    ],
    x: { scale: scaleBand<number> },
    y: { scale: scaleLinear },
  })
  return createChartScene(definition, { width: 640, height: 400 })
}

function summaryValues<TDatum>(datum: BoxSummaryDatum<TDatum>) {
  return [
    datum.category,
    datum.q1,
    datum.median,
    datum.q3,
    datum.whiskerLow,
    datum.whiskerHigh,
  ]
}

function semanticBoxDatum<TDatum, TCategory extends string | number | Date>(
  datum: BoxDatum<TDatum, TCategory>,
): BoxDatum<TDatum, TCategory> {
  if (datum.kind === 'outlier') {
    return {
      kind: datum.kind,
      category: datum.category,
      value: datum.value,
      source: datum.source,
      sourceIndexes: datum.sourceIndexes,
    }
  }
  return {
    kind: datum.kind,
    category: datum.category,
    q1: datum.q1,
    median: datum.median,
    q3: datum.q3,
    whiskerLow: datum.whiskerLow,
    whiskerHigh: datum.whiskerHigh,
    count: datum.count,
    source: datum.source,
    sourceIndexes: datum.sourceIndexes,
  }
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
