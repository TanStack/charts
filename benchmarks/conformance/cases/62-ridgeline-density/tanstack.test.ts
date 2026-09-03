import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { simpsons } from '@tanstack/charts-data/simpsons'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isRatedEpisode, ratingBoundaries, ridgeSeasons } from './selection'
import { createExampleChart } from './tanstack'
import type { RatedEpisode } from './selection'
import type {
  ChartSpecDatum,
  SceneArea,
  SceneNode,
  ScenePolyline,
  SceneRule,
} from '@tanstack/charts'

describe('ridgeline density comparison', () => {
  it.each([0, 1])(
    'uses declarative bins, grouped max normalization, and semantic seasons for revision %s',
    (revision) => {
      const seasons = ridgeSeasons(revision)
      const episodes = simpsons.filter(
        (row): row is RatedEpisode =>
          isRatedEpisode(row) && seasons.includes(row.season),
      )
      const definition = createExampleChart({
        revision,
      })
      type Datum = ChartSpecDatum<typeof definition>
      expectTypeOf<Datum['height']>().toEqualTypeOf<number>()
      expectTypeOf<Datum['season']>().toEqualTypeOf<number>()
      expectTypeOf<Datum['x']>().toEqualTypeOf<number>()
      const scene = createChartScene(definition, { width: 720, height: 480 })
      const points = scene.points.filter(
        (point) => point.markId === 'rating-ridges',
      )
      const centers = ratingBoundaries
        .slice(0, -1)
        .map((lower, index) => (lower + ratingBoundaries[index + 1]!) / 2)

      expect(points).toHaveLength(seasons.length * centers.length)
      expect(scene.scales.y.domain).toEqual(seasons)
      expect(scene.scales.y.ticks.map((tick) => tick.value)).toEqual(seasons)
      expect(scene.scales.y.ticks.map((tick) => tick.label)).toEqual(
        seasons.map((season) => `Season ${season}`),
      )

      for (const season of seasons) {
        const ridge = points.filter((point) => point.yValue === season)
        expect(ridge).toHaveLength(24)
        expect(ridge.map((point) => point.xValue)).toEqual(centers)
        expect(Math.max(...ridge.map((point) => point.datum.height))).toBe(1)
        expect(ridge.every((point) => point.group === season)).toBe(true)
      }

      const immediateBins = points.map((point) => point.datum.source[0]!)
      expect(new Set(immediateBins).size).toBe(points.length)
      expect(
        points
          .flatMap((point) => point.datum.sourceIndexes)
          .sort((left, right) => left - right),
      ).toEqual(Array.from({ length: points.length }, (_, index) => index))
      for (const point of points) {
        const normalized = point.datum
        const bin = normalized.source[0]!
        expect(normalized.source).toHaveLength(1)
        expect(bin.season).toBe(normalized.season)
        expect(bin.x).toBe(normalized.x)
        expect(bin.count).toBe(bin.source.length)
        expect(bin.sourceIndexes).toHaveLength(bin.source.length)
        bin.sourceIndexes.forEach((sourceIndex, index) => {
          expect(bin.source[index]).toBe(episodes[sourceIndex])
        })
      }

      const includedEpisodeIndexes = immediateBins
        .flatMap((bin) => bin.source)
        .map((episode) => episodes.indexOf(episode))
        .sort((left, right) => left - right)
      expect(includedEpisodeIndexes).toEqual(
        episodes
          .flatMap((episode, index) =>
            episode.imdb_rating >= ratingBoundaries[0] &&
            episode.imdb_rating <= ratingBoundaries.at(-1)!
              ? [index]
              : [],
          )
          .sort((left, right) => left - right),
      )
    },
  )

  it.each([320, 640, 960])(
    'derives responsive ridge offsets from the semantic category step at %spx',
    (width) => {
      const definition = createExampleChart({
        revision: 0,
      })
      const scene = createChartScene(definition, { width, height: 480 })
      const points = scene.points.filter(
        (point) => point.markId === 'rating-ridges',
      )
      const positions = ridgeSeasons(0).map((season) =>
        scene.scales.y.map(season),
      )
      const step = Math.min(
        ...positions
          .slice(1)
          .map((position, index) => Math.abs(position - positions[index]!)),
      )

      for (const point of points) {
        expect(point.x).toBe(scene.scales.x.map(point.datum.x))
        expect(point.y).toBeCloseTo(
          scene.scales.y.map(point.datum.season) -
            point.datum.height * 0.78 * step,
        )
        expect(point.y).toBeGreaterThanOrEqual(scene.chart.y - 1e-9)
        expect(point.y).toBeLessThanOrEqual(
          scene.chart.y + scene.chart.height + 1e-9,
        )
      }

      const nodes = flatten(scene.nodes)
      const areas = nodes.filter(
        (node): node is SceneArea =>
          node.kind === 'area' && node.key.startsWith('rating-ridges:'),
      )
      const lines = nodes.filter(
        (node): node is ScenePolyline =>
          node.kind === 'polyline' && node.key.startsWith('rating-ridges:'),
      )
      const rules = nodes.filter(
        (node): node is SceneRule =>
          node.kind === 'rule' && node.key.startsWith('season-guides:'),
      )

      expect(areas).toHaveLength(3)
      expect(lines).toHaveLength(3)
      expect(rules).toHaveLength(3)
      expect(areas.every((area) => area.path?.startsWith('M'))).toBe(true)
      expect(lines.every((line) => line.path?.startsWith('M'))).toBe(true)
      rules.forEach((rule, index) => {
        expect(rule.y1).toBe(scene.scales.y.map(ridgeSeasons(0)[index]!))
        expect(rule.y2).toBe(rule.y1)
      })
    },
  )

  it('keeps stable semantic identities while resizing', () => {
    const definition = createExampleChart({
      revision: 0,
    })
    const narrow = createChartScene(definition, { width: 320, height: 360 })
    const wide = createChartScene(definition, { width: 960, height: 600 })
    const narrowPoints = narrow.points.filter(
      (point) => point.markId === 'rating-ridges',
    )
    const widePoints = wide.points.filter(
      (point) => point.markId === 'rating-ridges',
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

  it('contains no case-owned bins, normalization, or numeric ridge layout', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/62-ridgeline-density/example.tsx',
      ),
      'utf8',
    )

    for (const forbidden of [
      "from 'd3-array'",
      "from './transform'",
      'ridgeDensity',
      'RidgePoint',
      'baseline',
      'density:',
      'Math.round',
      'domain([-0.08, 2.86])',
      'margin: { left:',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).not.toMatch(/\b(?:areaY|lineY)\(/u)
    expect(source).toContain('binX(')
    expect(source).toContain('normalize(')
    expect(source).toContain("basis: 'max'")
    expect(source).toContain('ridgelineY(')
    expect(source).toContain('ruleY(seasons')
    expect(source).toContain('scalePoint<number>()')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
