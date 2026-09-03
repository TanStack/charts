import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@tanstack/charts-data/penguins'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createExampleChart,
  species,
  type PenguinMass,
  type PenguinSpecies,
} from './tanstack'
import type {
  ChartScene,
  ChartSpecDatum,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

type DistributionDatum = ChartSpecDatum<ReturnType<typeof createExampleChart>>
type AggregateBin = DistributionDatum['source'][number]

const completeRows = penguins.filter((row): row is PenguinMass => {
  return (
    row.body_mass_g !== null && species.includes(row.species as PenguinSpecies)
  )
})

describe('definition-owned faceted distributions', () => {
  it.each([0, 1])(
    'bins and normalizes each species independently at revision %i',
    (revision) => {
      const selected = completeRows.slice(revision * 8, revision * 8 + 320)
      const scene = render(revision)
      const points = scene.points

      expectTypeOf<
        DistributionDatum['species']
      >().toEqualTypeOf<PenguinSpecies>()
      expectTypeOf<DistributionDatum['count']>().toEqualTypeOf<number>()
      expectTypeOf<DistributionDatum['proportion']>().toEqualTypeOf<number>()
      expectTypeOf<
        AggregateBin['source'][number]
      >().toEqualTypeOf<PenguinMass>()
      expect(points).toHaveLength(16)
      expect(
        facetCells(scene).map((cell) =>
          species.find((speciesName) => cell.key.includes(speciesName)),
        ),
      ).toEqual(species)

      for (const speciesName of species) {
        const sourceRows = selected.filter((row) => row.species === speciesName)
        const bins = points
          .map(({ datum }) => datum)
          .filter((datum) => datum.species === speciesName)

        expect(bins.length).toBeGreaterThan(0)
        expect(bins.every(({ count }) => count > 0)).toBe(true)
        expect(bins.reduce((total, { count }) => total + count, 0)).toBe(
          sourceRows.length,
        )
        expect(
          bins.reduce((total, { proportion }) => total + proportion, 0),
        ).toBeCloseTo(1)

        for (const datum of bins) {
          expect(datum.x2 - datum.x1).toBe(500)
          expect(datum.source).toHaveLength(1)
          const aggregate = datum.source[0]!
          expect(aggregate.count).toBe(datum.count)
          expect(aggregate.source).toHaveLength(datum.count)
          expect(aggregate.sourceIndexes).toHaveLength(datum.count)
          aggregate.sourceIndexes.forEach((sourceIndex, index) => {
            expect(aggregate.source[index]).toBe(selected[sourceIndex])
          })
          aggregate.source.forEach((row) => {
            expect(row.species).toBe(speciesName)
            expect(row.body_mass_g).toBeGreaterThanOrEqual(datum.x1)
            expect(row.body_mass_g).toBeLessThanOrEqual(datum.x2)
          })
        }
      }
    },
  )

  it('keeps grouped binning and facet-local normalization beside the marks', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/51-faceted-distributions/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('const bins = normalize(')
    expect(source).toContain('binX(rows, {')
    expect(source).toContain("by: 'species'")
    expect(source).toContain('thresholds: boundaries')
    expect(source).toContain("basis: 'sum'")
    expect(source).toContain("as: 'proportion'")
    expect(source).toContain('.filter(({ count }) => count > 0)')
    expect(source).toContain('species.indexOf(left.species)')
    expect(source).toContain('scaleLinear().domain([0, 0.4])')
    expect(source).not.toContain('prepareFacetedDistributionBins')
    expect(source).not.toContain('createBins')
    expect(source).not.toContain('DistributionBin')
    expect(source).not.toContain("from 'd3-array'")
  })
})

function render(revision: number) {
  const input = {
    width: 640,
    height: 400,
    revision,
  } satisfies ConformanceInput
  return createChartRuntime<DistributionDatum>().render(
    createExampleChart(input),
    input,
  )
}

function facetCells(scene: ChartScene): SceneGroup[] {
  return flatten(scene.nodes).filter(
    (node): node is SceneGroup =>
      node.kind === 'group' && node.className === 'ts-chart__facet-cell',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
