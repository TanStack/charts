import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@charts-poc/demo-data/penguins'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isPenguinMass, massBoundaries, violinSpecies } from './selection'
import { violinDefinition } from './tanstack'
import type { ViolinSpecies } from './selection'
import type {
  ChartPoint,
  ChartSpecDatum,
  SceneArea,
  SceneDot,
  SceneNode,
  SceneRule,
} from '@tanstack/charts'

const expectedMaxima = [
  { Adelie: 29, Chinstrap: 20, Gentoo: 17 },
  { Adelie: 27, Chinstrap: 20, Gentoo: 19 },
] as const

describe('violin distribution comparison', () => {
  it.each([0, 1])(
    'uses explicit bins, normalization, summaries, and semantic categories for revision %s',
    (revision) => {
      const observations = penguins
        .filter(isPenguinMass)
        .slice(revision * 8, revision * 8 + 320)
      const definition = violinDefinition({
        width: 720,
        height: 480,
        revision,
      })
      type Datum = ChartSpecDatum<typeof definition>
      type Profile = Extract<Datum, { width: number }>
      type Summary = Extract<Datum, { median: number }>
      expectTypeOf<Profile['species']>().toEqualTypeOf<ViolinSpecies>()
      expectTypeOf<Profile['width']>().toEqualTypeOf<number>()
      expectTypeOf<Profile['y']>().toEqualTypeOf<number>()
      expectTypeOf<Summary['median']>().toEqualTypeOf<number>()
      const scene = createChartScene(definition, { width: 720, height: 480 })
      const profiles = scene.points.filter(
        (point) => point.markId === 'mass-violins',
      ) as ChartPoint<Profile>[]
      const summaries = scene.points.filter(
        (point) => point.markId === 'median-dots',
      ) as ChartPoint<Summary>[]
      const centers = massBoundaries
        .slice(0, -1)
        .map((lower, index) => (lower + massBoundaries[index + 1]!) / 2)

      expect(observations).toHaveLength(320)
      expect(profiles).toHaveLength(48)
      expect(summaries).toHaveLength(3)
      expect(scene.scales.x.domain).toEqual(violinSpecies)
      expect(scene.scales.x.ticks.map((tick) => tick.value)).toEqual(
        violinSpecies,
      )
      expect(scene.scales.x.ticks.map((tick) => tick.label)).toEqual(
        violinSpecies,
      )
      expect(scene.colors.domain).toEqual(violinSpecies)

      for (const species of violinSpecies) {
        const profile = profiles.filter(
          (point) => point.datum.species === species,
        )
        expect(profile).toHaveLength(16)
        expect(profile.map((point) => point.datum.y)).toEqual(centers)
        expect(Math.max(...profile.map((point) => point.datum.width))).toBe(1)
        expect(
          Math.max(...profile.map((point) => point.datum.source[0]!.count)),
        ).toBe(expectedMaxima[revision]![species])
        expect(profile.every((point) => point.group === species)).toBe(true)
        expect(profile.every((point) => point.xValue === species)).toBe(true)
      }

      expect(
        Object.fromEntries(
          summaries.map((point) => [point.datum.species, point.datum.median]),
        ),
      ).toEqual({ Adelie: 3700, Chinstrap: 3700, Gentoo: 5000 })

      const immediateBins = profiles.map((point) => point.datum.source[0]!)
      expect(new Set(immediateBins).size).toBe(profiles.length)
      expect(
        profiles
          .flatMap((point) => point.datum.sourceIndexes)
          .sort((left, right) => left - right),
      ).toEqual(Array.from({ length: profiles.length }, (_, index) => index))
      for (const point of profiles) {
        const normalized = point.datum
        const bin = normalized.source[0]!
        expect(normalized.source).toHaveLength(1)
        expect(bin.species).toBe(normalized.species)
        expect(bin.y).toBe(normalized.y)
        expect(bin.count).toBe(bin.source.length)
        bin.sourceIndexes.forEach((sourceIndex, index) => {
          expect(bin.source[index]).toBe(observations[sourceIndex])
        })
      }

      const profileSources = immediateBins
        .flatMap((bin) => bin.source)
        .map((observation) => observations.indexOf(observation))
        .sort((left, right) => left - right)
      expect(profileSources).toEqual(
        Array.from({ length: observations.length }, (_, index) => index),
      )
      const summarySources = summaries
        .flatMap((point) => point.datum.source)
        .map((observation) => observations.indexOf(observation))
        .sort((left, right) => left - right)
      expect(summarySources).toEqual(
        Array.from({ length: observations.length }, (_, index) => index),
      )
    },
  )

  it.each([320, 640, 960])(
    'keeps envelopes and median ticks symmetric in category-step units at %spx',
    (width) => {
      const scene = createChartScene(
        violinDefinition({ width, height: 480, revision: 0 }),
        { width, height: 480 },
      )
      const areas = sceneAreas(scene.nodes)
      const rules = sceneRules(scene.nodes).filter((rule) =>
        rule.key.startsWith('median-ticks:'),
      )
      const dots = sceneDots(scene.nodes).filter((dot) =>
        dot.key.startsWith('median-dots:'),
      )
      const step = Math.abs(
        scene.scales.x.map(violinSpecies[1]) -
          scene.scales.x.map(violinSpecies[0]),
      )

      expect(areas).toHaveLength(3)
      expect(rules).toHaveLength(3)
      expect(new Set(dots.map((dot) => dot.key)).size).toBe(3)
      for (const area of areas) {
        const points = interactionPoints(area)
        expect(points).toHaveLength(16)
        expect(area.points).toHaveLength(32)
        expect(area.path).toMatch(/^M.*Z$/)
        points.forEach((point, index) => {
          const positive = area.points[index]!
          const negative = area.points[area.points.length - 1 - index]!
          const datum = point.datum as { species: ViolinSpecies; width: number }
          const center = scene.scales.x.map(datum.species)
          const halfWidth = datum.width * 0.76 * step * 0.5
          expect(point.x).toBe(center)
          expect(positive[0]).toBeCloseTo(center + halfWidth)
          expect(negative[0]).toBeCloseTo(center - halfWidth)
          expect(positive[1]).toBe(point.y)
          expect(negative[1]).toBe(point.y)
        })
      }
      rules.forEach((rule, index) => {
        const point = scene.points.filter(
          (candidate) => candidate.markId === 'median-ticks',
        )[index]!
        expect(rule.x2 - rule.x1).toBeCloseTo(step * 0.36)
        expect((rule.x1 + rule.x2) / 2).toBeCloseTo(point.x)
        expect(rule.y1).toBe(point.y)
        expect(rule.y2).toBe(point.y)
      })
    },
  )

  it('keeps semantic identities stable while resizing', () => {
    const definition = violinDefinition({
      width: 640,
      height: 480,
      revision: 0,
    })
    const narrow = createChartScene(definition, { width: 320, height: 360 })
    const wide = createChartScene(definition, { width: 960, height: 600 })
    const narrowProfiles = narrow.points.filter(
      (point) => point.markId === 'mass-violins',
    )
    const wideProfiles = wide.points.filter(
      (point) => point.markId === 'mass-violins',
    )

    expect(wideProfiles.map((point) => point.key)).toEqual(
      narrowProfiles.map((point) => point.key),
    )
    expect(wideProfiles.map((point) => point.datum)).toEqual(
      narrowProfiles.map((point) => point.datum),
    )
    expect(wideProfiles.map((point) => [point.x, point.y])).not.toEqual(
      narrowProfiles.map((point) => [point.x, point.y]),
    )
  })

  it('contains no case-owned profile DTO or numeric category layout', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/63-violin-distributions/tanstack.ts',
      ),
      'utf8',
    )

    for (const forbidden of [
      "from './transform'",
      'violinDensity',
      'violinMedians',
      'ViolinPoint',
      'ViolinMedian',
      'x1:',
      'x2:',
      'center',
      'Math.round',
      'domain([0.5, 3.5])',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).not.toMatch(/\b(?:areaX|link)\(/u)
    expect(source).toContain('binY(')
    expect(source).toContain('normalize(')
    expect(source).toContain("basis: 'max'")
    expect(source).toContain('groupBy(')
    expect(source).toContain('reduce: median')
    expect(source).toContain('violinY(')
    expect(source).toContain('tickY(')
    expect(source).toContain('scalePoint<string>()')
  })
})

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function sceneRules(nodes: readonly SceneNode[]): SceneRule[] {
  return flatten(nodes).filter(
    (node): node is SceneRule => node.kind === 'rule',
  )
}

function sceneDots(nodes: readonly SceneNode[]): SceneDot[] {
  return flatten(nodes).filter((node): node is SceneDot => node.kind === 'dot')
}

function interactionPoints(area: SceneArea) {
  const interaction = area.interaction
  return interaction && 'points' in interaction
    ? (interaction.points ?? [])
    : []
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
