import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { survey } from '@tanstack/charts-data/survey'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isMosaicResponse, mosaicResponses } from './selection'
import { createExampleChart } from './tanstack'
import type {
  ChartPoint,
  ChartSpecDatum,
  SceneNode,
  SceneRect,
} from '@tanstack/charts'
import type { MosaicResponse } from './selection'

const expectedQuestionTotals = {
  Q1: 101,
  Q2: 95,
  Q3: 103,
  Q4: 100,
  Q5: 101,
} as const

describe('Marimekko survey composition', () => {
  it('keeps aggregation policy explicit and allocates both denominators declaratively', () => {
    const observations = survey.filter(isMosaicResponse)
    const definition = createExampleChart()
    type Datum = ChartSpecDatum<typeof definition>
    expectTypeOf<Datum['Question']>().toEqualTypeOf<string>()
    expectTypeOf<Datum['Response']>().toEqualTypeOf<MosaicResponse>()
    expectTypeOf<Datum['value']>().toEqualTypeOf<number>()
    expectTypeOf<Datum['xTotal']>().toEqualTypeOf<number>()
    expectTypeOf<Datum['source'][number]['count']>().toEqualTypeOf<number>()

    const scene = createChartScene(definition, { width: 720, height: 480 })
    const cellPoints = scene.points.filter(
      (point) => point.markId === 'response-cells',
    ) as ChartPoint<Datum>[]
    const labelPoints = scene.points.filter(
      (point) => point.markId === 'question-labels',
    ) as ChartPoint<Datum>[]
    const cells = cellPoints.map((point) => point.datum)

    expect(observations).toHaveLength(500)
    expect(cells).toHaveLength(25)
    expect(labelPoints).toHaveLength(5)
    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 1.12])
    expect(scene.colors.domain).toEqual(mosaicResponses)
    expect(new Set(cells).size).toBe(25)
    expect(labelPoints.every((point) => cells.includes(point.datum))).toBe(true)

    for (const [question, questionTotal] of Object.entries(
      expectedQuestionTotals,
    )) {
      const group = cells
        .filter((cell) => cell.Question === question)
        .sort((left, right) => left.y1 - right.y1)

      expect(group).toHaveLength(5)
      expect(group.map((cell) => cell.Response)).toEqual(mosaicResponses)
      expect(group.every((cell) => cell.xValue === question)).toBe(true)
      expect(group.every((cell) => cell.xTotal === questionTotal)).toBe(true)
      expect(group.every((cell) => cell.total === observations.length)).toBe(
        true,
      )
      expect(group[0]?.y1).toBe(0)
      expect(group.at(-1)?.y2).toBe(1)
      expect(group[0]!.x2 - group[0]!.x1).toBeCloseTo(
        questionTotal / observations.length,
        12,
      )

      for (const cell of group) {
        expect(cell.yValue).toBe(cell.Response)
        expect(cell.value).toBe(cell.count)
        expect((cell.x2 - cell.x1) * (cell.y2 - cell.y1)).toBeCloseTo(
          cell.value / observations.length,
          12,
        )
      }
    }

    const counts = cells.map((cell) => cell.source[0]!)
    expect(new Set(counts).size).toBe(25)
    expect(
      cells
        .flatMap((cell) => cell.sourceIndexes)
        .sort((left, right) => left - right),
    ).toEqual(Array.from({ length: 25 }, (_, index) => index))

    for (const cell of cells) {
      const count = cell.source[0]!
      expect(cell.source).toHaveLength(1)
      expect(count.Question).toBe(cell.Question)
      expect(count.Response).toBe(cell.Response)
      expect(count.count).toBe(count.source.length)
      count.sourceIndexes.forEach((sourceIndex, index) => {
        expect(count.source[index]).toBe(observations[sourceIndex])
      })
    }

    expect(
      counts
        .flatMap((count) => count.source)
        .map((row) => observations.indexOf(row))
        .sort((left, right) => left - right),
    ).toEqual(Array.from({ length: observations.length }, (_, index) => index))
  })

  it.each([320, 640, 960])(
    'renders ordinary rectangles and labels at %spx',
    (width) => {
      const scene = createChartScene(createExampleChart(), {
        width,
        height: 480,
      })
      const points = scene.points.filter(
        (point) => point.markId === 'response-cells',
      )
      const rectangles = sceneRects(scene.nodes).filter((node) =>
        node.key.startsWith('response-cells:'),
      )
      const labels = flatten(scene.nodes).filter(
        (node) =>
          node.kind === 'label' && node.key.startsWith('question-labels:'),
      )

      expect(points).toHaveLength(25)
      expect(rectangles).toHaveLength(25)
      expect(labels).toHaveLength(5)
      points.forEach((point) => {
        const datum = point.datum as {
          x: number
          x1: number
          x2: number
          y: number
          y1: number
          y2: number
        }
        expect(point.xValue).toBe(datum.x)
        expect(point.yValue).toBe(datum.y)
        expect(point.x).toBeCloseTo(scene.scales.x.map(datum.x), 12)
        expect(point.y).toBeCloseTo(scene.scales.y.map(datum.y), 12)
        expect(point.x1Value).toBe(datum.x1)
        expect(point.x2Value).toBe(datum.x2)
        expect(point.y1Value).toBe(datum.y1)
        expect(point.y2Value).toBe(datum.y2)
      })
    },
  )

  it('keeps cell and label identity stable while resizing', () => {
    const definition = createExampleChart()
    const narrow = createChartScene(definition, { width: 320, height: 360 })
    const wide = createChartScene(definition, { width: 960, height: 600 })
    const narrowPoints = narrow.points.filter((point) =>
      ['response-cells', 'question-labels'].includes(point.markId),
    )
    const widePoints = wide.points.filter((point) =>
      ['response-cells', 'question-labels'].includes(point.markId),
    )

    expect(widePoints.map((point) => point.key)).toEqual(
      narrowPoints.map((point) => point.key),
    )
    expect(widePoints.map((point) => point.datum)).toEqual(
      narrowPoints.map((point) => point.datum),
    )
    expect(widePoints.map((point) => [point.x, point.y])).not.toEqual(
      narrowPoints.map((point) => [point.x, point.y]),
    )
  })

  it('contains no case-owned mosaic layout or cumulative endpoint code', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/64-marimekko-mosaic/example.tsx',
      ),
      'utf8',
    )

    for (const forbidden of [
      "from './layout'",
      'mosaicLayout',
      'd3-array',
      'cumsum',
      'rollup',
      'grandTotal',
      'xEnds',
      'yEnds',
      'MosaicCell',
      'MosaicLabel',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('groupBy(')
    expect(source).toContain("reduce: 'count'")
    expect(source).toContain('mosaicY(')
    expect(source).toContain('select(')
    expect(source).toContain('rect(cells')
    expect(source).toContain('text(labels')
  })
})

function sceneRects(nodes: readonly SceneNode[]): SceneRect[] {
  return flatten(nodes).filter(
    (node): node is SceneRect => node.kind === 'rect',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
