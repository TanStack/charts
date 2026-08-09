import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { driving } from '@charts-poc/demo-data/driving'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  connectedScatterDefinition,
  directionPairs,
  directionTargetIndexes,
} from './tanstack'
import type { DrivingRow } from '@charts-poc/demo-data/driving'
import type { ChartSpecDatum } from '@tanstack/charts'

type ConnectedDatum = ChartSpecDatum<
  ReturnType<typeof connectedScatterDefinition>
>
type DirectionDatum = (typeof directionPairs)[number]

describe('definition-owned connected-scatter direction', () => {
  it('uses ordered two-row windows with exact source lineage', () => {
    expectTypeOf<DirectionDatum['source'][number]>().toEqualTypeOf<DrivingRow>()
    expect(directionPairs).toHaveLength(directionTargetIndexes.length)
    expect(directionPairs.map(({ sourceIndexes }) => sourceIndexes)).toEqual(
      directionTargetIndexes.map((targetIndex) => [
        targetIndex - 1,
        targetIndex,
      ]),
    )

    directionPairs.forEach((pair, index) => {
      const targetIndex = directionTargetIndexes[index]!
      expect(pair.source).toHaveLength(2)
      expect(pair.source[0]).toBe(driving[targetIndex - 1])
      expect(pair.source[1]).toBe(driving[targetIndex])
      expect(pair.year).toBe(driving[targetIndex]!.year)
      expect(pair.miles).toBe(driving[targetIndex]!.miles)
      expect(pair.gas).toBe(driving[targetIndex]!.gas)
    })
  })

  it('feeds the window rows directly to native arrows', () => {
    const scene = createChartRuntime<ConnectedDatum>().render(
      connectedScatterDefinition(),
      { width: 640, height: 400 },
    )
    const arrows = scene.points.filter(
      ({ markId }) => markId === 'direction-arrows',
    )

    expect(arrows).toHaveLength(directionPairs.length)
    arrows.forEach((point, index) => {
      const pair = directionPairs[index]!
      const source = pair.source[0]!

      expect(point.datum).toBe(pair)
      expect(point.x1Value).toBe(source.miles)
      expect(point.y1Value).toBe(source.gas)
      expect(point.x2Value).toBe(pair.miles)
      expect(point.y2Value).toBe(pair.gas)
    })
  })

  it('keeps only sampling policy outside the public window and arrow primitives', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/56-connected-scatter/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('directionTargetIndexes = [14, 28, 42]')
    expect(source).toContain('directionPairs = rollingWindow(driving')
    expect(source).toContain("orderBy: 'year'")
    expect(source).toContain('size: 2')
    expect(source).toContain('partial: false')
    expect(source).toContain('arrow(directionPairs')
    expect(source).toContain('x1: ({ source }) => source[0]?.miles')
    expect(source).toContain("x2: 'miles'")
    expect(source).not.toContain('directionSegments')
    expect(source).not.toContain('DirectionSegment')
    expect(source).not.toContain("x1: 'miles1'")
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
  })
})
