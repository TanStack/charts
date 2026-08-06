import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { resourceLanes, resourceTasks, timelineStatuses } from './scenario'
import { resourceTimelineDefinition } from './tanstack'
import type { DynamicChartDefinition } from '@tanstack/charts'
import type { ResourceTask } from './scenario'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput

describe('native scrollable resource timeline geometry', () => {
  it.each([0, 1])(
    'keeps revision %s interval geometry in one ordinary rect mark',
    (revision) => {
      const nextInput = { ...input, revision }
      const definition = resourceTimelineDefinition(nextInput)
      const rows = resourceTasks(revision)
      const scene = createChartRuntime<ResourceTask>().render(definition, {
        width: nextInput.width,
        height: nextInput.height,
      })

      expectTypeOf(definition).toMatchTypeOf<
        DynamicChartDefinition<ResourceTask>
      >()
      expect(scene.points).toHaveLength(rows.length)
      expect(scene.points.map((point) => point.datum)).toEqual(rows)
      expect(scene.points.map((point) => point.key)).toEqual(
        rows.map((row) => expect.stringContaining(row.id)),
      )
      expect(scene.scales.y.domain).toEqual(resourceLanes)
      expect(scene.colors.domain).toEqual(timelineStatuses)
    },
  )

  it('preserves inferred task identity when interval dates change', () => {
    const initial = pointsByTaskId(0)
    const revised = pointsByTaskId(1)

    expect(revised.get('api-build')?.key).toBe(initial.get('api-build')?.key)
    expect(revised.get('quality-release')?.key).toBe(
      initial.get('quality-release')?.key,
    )
    expect(revised.get('api-build')?.x2Value).not.toBe(
      initial.get('api-build')?.x2Value,
    )
  })

  it('aligns the application rail from the resolved chart scale', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/85-scrollable-resource-lanes',
    )
    const shell = readFileSync(resolve(directory, 'shell.ts'), 'utf8')
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(shell).not.toContain("from 'd3-scale'")
    expect(source).toContain('scene.scales.y.map(lane)')
    expect(source).toContain('onFocusChange: updateFocusedTask')
    expect(source).not.toContain('onFocusGroupChange')
  })
})

function pointsByTaskId(revision: number) {
  const definition = resourceTimelineDefinition({ ...input, revision })
  const scene = createChartRuntime<ResourceTask>().render(definition, {
    width: input.width,
    height: input.height,
  })
  return new Map(scene.points.map((point) => [point.datum.id, point]))
}
