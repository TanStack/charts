import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@charts-poc/demo-data/penguins'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isSexedPenguin, pyramidSexes } from './selection'
import { populationPyramidDefinition } from './tanstack'
import type {
  ChartPoint,
  ChartSpecDatum,
  SceneNode,
  SceneRect,
} from '@tanstack/charts'
import type { PyramidSex, SexedPenguin } from './selection'

const expectedCounts = [
  {
    'Adelie:MALE': 73,
    'Adelie:FEMALE': 73,
    'Chinstrap:MALE': 34,
    'Chinstrap:FEMALE': 34,
    'Gentoo:MALE': 61,
    'Gentoo:FEMALE': 58,
  },
  {
    'Adelie:MALE': 73,
    'Adelie:FEMALE': 73,
    'Chinstrap:MALE': 34,
    'Chinstrap:FEMALE': 34,
    'Gentoo:MALE': 58,
    'Gentoo:FEMALE': 55,
  },
] as const

describe('definition-owned population pyramid', () => {
  it.each([0, 1])(
    'groups source observations and signs the quantitative channel for revision %s',
    (revision) => {
      const sourceRows = revision === 0 ? penguins : penguins.slice(0, -8)
      const observations = sourceRows.filter(isSexedPenguin)
      const definition = populationPyramidDefinition({
        width: 640,
        height: 400,
        revision,
      })
      type Datum = ChartSpecDatum<typeof definition>
      expectTypeOf<Datum['species']>().toEqualTypeOf<string>()
      expectTypeOf<Datum['sex']>().toEqualTypeOf<PyramidSex>()
      expectTypeOf<Datum['count']>().toEqualTypeOf<number>()
      expectTypeOf<Datum['source'][number]>().toEqualTypeOf<SexedPenguin>()

      const scene = createChartScene(definition, { width: 640, height: 400 })
      const bars = scene.points.filter(
        (point) => point.markId === 'population-bars',
      ) as ChartPoint<Datum>[]

      expect(bars).toHaveLength(6)
      expect(scene.scales.x.domain).toEqual([-80, 80])
      expect(scene.scales.y.domain).toEqual(['Adelie', 'Chinstrap', 'Gentoo'])
      expect(scene.colors.domain).toEqual(pyramidSexes)
      expect(new Set(bars.map((point) => point.key)).size).toBe(6)

      for (const point of bars) {
        const row = point.datum
        const identity =
          `${row.species}:${row.sex}` as keyof (typeof expectedCounts)[0]
        const count = expectedCounts[revision]![identity]
        expect(row.count).toBe(count)
        expect(row.source).toHaveLength(count)
        expect(point.group).toBe(row.sex)
        expect(point.xValue).toBe(row.sex === 'MALE' ? -count : count)
        expect(point.x1Value).toBe(row.sex === 'MALE' ? -count : 0)
        expect(point.x2Value).toBe(row.sex === 'MALE' ? 0 : count)
        row.sourceIndexes.forEach((sourceIndex, index) => {
          expect(row.source[index]).toBe(observations[sourceIndex])
        })
      }

      expect(
        bars
          .flatMap((point) => point.datum.source)
          .map((row) => observations.indexOf(row))
          .sort((left, right) => left - right),
      ).toEqual(
        Array.from({ length: observations.length }, (_, index) => index),
      )
    },
  )

  it('keeps semantic bar identities stable across data revisions', () => {
    const keys = [0, 1].map((revision) =>
      createChartScene(
        populationPyramidDefinition({ width: 640, height: 400, revision }),
        { width: 640, height: 400 },
      )
        .points.filter((point) => point.markId === 'population-bars')
        .map((point) => point.key),
    )

    expect(keys[1]).toEqual(keys[0])
  })

  it.each([320, 640, 960])(
    'keeps both sexes joined to the shared zero baseline at %spx',
    (width) => {
      const scene = createChartScene(
        populationPyramidDefinition({ width, height: 400, revision: 0 }),
        { width, height: 400 },
      )
      const zero = scene.scales.x.map(0)
      const rectangles = sceneRects(scene.nodes).filter((node) =>
        node.key.startsWith('population-bars:'),
      )

      expect(rectangles).toHaveLength(6)
      for (const rectangle of rectangles) {
        const point = rectangle.interaction?.point
        expect(point).toBeDefined()
        const datum = point!.datum as { sex: PyramidSex }
        if (datum.sex === 'MALE') {
          expect(rectangle.x + rectangle.width).toBeCloseTo(zero, 12)
        } else {
          expect(rectangle.x).toBeCloseTo(zero, 12)
        }
      }
    },
  )

  it('keeps semantic identities stable while resizing', () => {
    const definition = populationPyramidDefinition({
      width: 640,
      height: 400,
      revision: 0,
    })
    const narrow = createChartScene(definition, { width: 320, height: 360 })
    const wide = createChartScene(definition, { width: 960, height: 600 })
    const narrowBars = narrow.points.filter(
      (point) => point.markId === 'population-bars',
    )
    const wideBars = wide.points.filter(
      (point) => point.markId === 'population-bars',
    )

    expect(wideBars.map((point) => point.key)).toEqual(
      narrowBars.map((point) => point.key),
    )
    expect(wideBars.map((point) => point.datum)).toEqual(
      narrowBars.map((point) => point.datum),
    )
    expect(wideBars.map((point) => [point.x, point.y])).not.toEqual(
      narrowBars.map((point) => [point.x, point.y]),
    )
  })

  it('contains no case-owned grouping DTO or signed-row transform', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/71-recharts-population-pyramid/example.tsx',
      ),
      'utf8',
    )

    for (const forbidden of [
      "from './transform'",
      'countPenguinsBySpecies',
      'divergeMaleCounts',
      'PenguinSpeciesCount',
      'new Map',
      '.map((row)',
      "x: 'male'",
      "x: 'female'",
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('groupBy(observations')
    expect(source).toContain("outputs: { count: { reduce: 'count' } }")
    expect(source).toContain("row.sex === 'MALE' ? -row.count : row.count")
    expect(source).toContain("stack({ offset: 'diverging'")
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
