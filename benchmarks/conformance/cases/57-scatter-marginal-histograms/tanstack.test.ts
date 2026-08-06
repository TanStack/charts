import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { penguins } from '@charts-poc/demo-data/penguins'
import { createChartScene } from '@tanstack/charts'
import {
  flipperBoundaries,
  massBoundaries,
  scatterMarginalDefinition,
} from './tanstack'
import type { CompletePenguin } from './tanstack'
import type {
  ChartSpecDatum,
  SceneGroup,
  SceneNode,
  SceneRect,
  SceneRule,
} from '@tanstack/charts'

describe('scatterplot with marginal histograms', () => {
  it.each([0, 1])(
    'uses raw observations and aggregate bin lineage for revision %s',
    (revision) => {
      const expected = penguins
        .filter((row): row is CompletePenguin => {
          return row.flipper_length_mm !== null && row.body_mass_g !== null
        })
        .slice(revision * 8, revision * 8 + 320)
      const definition = scatterMarginalDefinition({
        width: 720,
        height: 480,
        revision,
      })
      type Datum = ChartSpecDatum<typeof definition>
      expectTypeOf<Datum>().not.toBeNever()
      const scene = createChartScene(definition, { width: 720, height: 480 })
      const raw = scene.points.filter((point) =>
        point.markId.endsWith(':penguins'),
      )
      const xBins = scene.points.filter((point) =>
        point.markId.endsWith(':flipper-histogram'),
      )
      const yBins = scene.points.filter((point) =>
        point.markId.endsWith(':mass-histogram'),
      )

      expect(raw).toHaveLength(expected.length)
      expect(raw.map((point) => point.datum)).toEqual(expected)
      raw.forEach((point, index) => {
        expect(point.datum).toBe(expected[index])
      })
      expect(xBins).toHaveLength(flipperBoundaries.length - 1)
      expect(yBins).toHaveLength(massBoundaries.length - 1)
      expect(
        xBins.reduce(
          (sum, point) =>
            sum + ('source' in point.datum ? point.datum.source.length : 0),
          0,
        ),
      ).toBe(expected.length)
      expect(
        yBins.reduce(
          (sum, point) =>
            sum + ('source' in point.datum ? point.datum.source.length : 0),
          0,
        ),
      ).toBe(expected.length)
      for (const point of [...xBins, ...yBins]) {
        if (!('source' in point.datum)) continue
        point.datum.source.forEach((source) => {
          expect(expected).toContain(source)
        })
      }
    },
  )

  it.each([320, 640, 960])(
    'keeps marginal plot ranges aligned at %spx',
    (width) => {
      const scene = createChartScene(
        scatterMarginalDefinition({ width, height: 480, revision: 0 }),
        { width, height: 480 },
      )
      const views = directViews(scene.nodes)
      const main = views.get('penguin-marginals:main:view')!
      const top = views.get('penguin-marginals:top:view')!
      const right = views.get('penguin-marginals:right:view')!
      const mainNodes = flatten(main.children)
      const topRects = flatten(top.children).filter(
        (node): node is SceneRect => node.kind === 'rect',
      )
      const rightRects = flatten(right.children).filter(
        (node): node is SceneRect => node.kind === 'rect',
      )
      const xAxis = mainNodes.find(
        (node): node is SceneRule =>
          node.kind === 'rule' && node.key === 'x-axis',
      )!
      const yAxis = mainNodes.find(
        (node): node is SceneRule =>
          node.kind === 'rule' && node.key === 'y-axis',
      )!
      const topLeft = Math.min(
        ...topRects.map((rect) => rect.x - (rect.inset ?? 0)),
      )
      const topRight = Math.max(
        ...topRects.map((rect) => rect.x + rect.width + (rect.inset ?? 0)),
      )
      const rightTop = Math.min(
        ...rightRects.map((rect) => rect.y - (rect.inset ?? 0)),
      )
      const rightBottom = Math.max(
        ...rightRects.map((rect) => rect.y + rect.height + (rect.inset ?? 0)),
      )

      expect((top.translateX ?? 0) + topLeft).toBeCloseTo(
        (main.translateX ?? 0) + xAxis.x1,
        6,
      )
      expect((top.translateX ?? 0) + topRight).toBeCloseTo(
        (main.translateX ?? 0) + xAxis.x2,
        6,
      )
      expect((right.translateY ?? 0) + rightTop).toBeCloseTo(
        (main.translateY ?? 0) + yAxis.y1,
        6,
      )
      expect((right.translateY ?? 0) + rightBottom).toBeCloseTo(
        (main.translateY ?? 0) + yAxis.y2,
        6,
      )
    },
  )

  it('contains no case-owned histogram layout or reserved-domain plotting', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/57-scatter-marginal-histograms/tanstack.ts',
      ),
      'utf8',
    )
    for (const forbidden of [
      "from 'd3-array'",
      'marginalRects',
      'MarginalRect',
      'max(',
      '6600',
      '237',
      'visibleFlipperTick',
      'visibleMassTick',
      'ruleX(',
      'ruleY(',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('binX(')
    expect(source).toContain('binY(')
    expect(source).toContain('viewGrid(')
    expect(source).toContain("share: { x: 'main' }")
    expect(source).toContain("share: { y: 'main' }")
  })
})

function directViews(nodes: readonly SceneNode[]): Map<string, SceneGroup> {
  const root = flatten(nodes).find(
    (node): node is SceneGroup =>
      node.kind === 'group' && node.className === 'ts-chart__views',
  )
  return new Map(
    (root?.children ?? []).flatMap((node) =>
      node.kind === 'group' && node.className === 'ts-chart__view'
        ? [[node.key, node] as const]
        : [],
    ),
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
