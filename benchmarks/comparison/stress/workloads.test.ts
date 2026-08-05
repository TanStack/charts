import { describe, expect, it } from 'vitest'
import { selectWeightedShard } from '../../../scripts/benchmark/filters.mjs'
import stressConfig from './workloads.json'
import type { StressUpdateKind, StressWorkloadId } from './types'

const workloadIds = [
  'raw-line',
  'raw-scatter',
  'interactive-scatter',
  'binned-density',
  'pixel-envelope',
  'viewport-envelope',
  'stats-multi-series-line',
  'rolling-keyed-window',
  'histogram-128',
  'top-categories',
  'dashboard-lines',
] satisfies StressWorkloadId[]

const updateKinds = [
  'noop',
  'same',
  'append',
  'replace',
  'reorder',
  'resize',
  'viewport',
  'toggle-series',
  'roll',
] satisfies StressUpdateKind[]

describe('stress workload configuration', () => {
  it('has one complete, uniquely identified workload catalog', () => {
    const ids = stressConfig.workloads.map(({ id }) => id)

    expect(stressConfig.schemaVersion).toBe(1)
    expect(ids).toEqual(workloadIds)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('balances every workload once from observed CI timings', () => {
    const evidenceIds = stressConfig.ciSharding.observedGroups.flatMap(
      ({ workloads }) => workloads,
    )
    expect(evidenceIds.length).toBe(workloadIds.length)
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length)
    expect([...evidenceIds].sort()).toEqual([...workloadIds].sort())

    const expectedShards = [
      ['raw-line', 'binned-density', 'viewport-envelope'],
      ['raw-scatter', 'pixel-envelope', 'top-categories'],
      ['interactive-scatter', 'histogram-128'],
      ['stats-multi-series-line', 'rolling-keyed-window', 'dashboard-lines'],
    ]
    const currentMaximumSeconds = Math.max(
      ...stressConfig.ciSharding.observedGroups.map(
        ({ elapsedSeconds }) => elapsedSeconds,
      ),
    )

    for (const profileName of ['standard', 'full'] as const) {
      for (const group of stressConfig.ciSharding.observedGroups) {
        const groupWeight = group.workloads.reduce((total, workloadId) => {
          const workload = stressConfig.workloads.find(
            ({ id }) => id === workloadId,
          )
          expect(workload).toBeDefined()
          return total + (workload?.ciWeight[profileName] ?? 0)
        }, 0)
        expect(groupWeight).toBe(group.elapsedSeconds)
      }

      const shards = [1, 2, 3, 4].map((index) =>
        selectWeightedShard(
          stressConfig.workloads,
          { index, total: 4 },
          (workload) => workload.ciWeight[profileName],
        ),
      )
      const shardIds = shards.map((workloads) => workloads.map(({ id }) => id))
      const selectedIds = shardIds.flat()
      const shardWeights = shards.map((workloads) =>
        workloads.reduce(
          (total, workload) => total + workload.ciWeight[profileName],
          0,
        ),
      )

      expect(shardIds).toEqual(expectedShards)
      expect(selectedIds.length).toBe(workloadIds.length)
      expect(new Set(selectedIds).size).toBe(selectedIds.length)
      expect([...selectedIds].sort()).toEqual([...workloadIds].sort())
      expect(shardWeights).toEqual([315, 298, 275, 336])
      expect(Math.max(...shardWeights)).toBeLessThan(currentMaximumSeconds)
    }
  })

  it('defines usable sampling profiles', () => {
    for (const profile of Object.values(stressConfig.profiles)) {
      expect(profile.warmup).toBeGreaterThanOrEqual(0)
      expect(profile.samples).toBeGreaterThan(0)
      expect(profile.preparationSamples).toBeGreaterThan(0)
      expect(profile.pointerSamples).toBeGreaterThan(0)
      expect(profile.pointerSweepSamples).toBeGreaterThan(0)
      expect(profile.soakCycles).toBeGreaterThan(0)
      expect(profile.streamDurationMs).toBeGreaterThan(0)
      expect(profile.burstRevisions).toBeGreaterThan(0)

      for (const value of [
        profile.warmup,
        profile.samples,
        profile.preparationSamples,
        profile.pointerSamples,
        profile.pointerSweepSamples,
        profile.soakCycles,
        profile.streamDurationMs,
        profile.burstRevisions,
      ]) {
        expect(Number.isInteger(value)).toBe(true)
      }
    }
  })

  it('defines valid source counts and update scenarios for every profile', () => {
    const allowedUpdates = new Set<string>(updateKinds)

    for (const workload of stressConfig.workloads) {
      expect(workload.updates.length).toBeGreaterThan(0)
      expect(workload.updates).toContain('noop')
      expect(new Set(workload.updates).size).toBe(workload.updates.length)
      expect(workload.updates.every((kind) => allowedUpdates.has(kind))).toBe(
        true,
      )

      for (const counts of Object.values(workload.sourceCounts)) {
        expect(counts.length).toBeGreaterThan(0)
        expect(
          counts.every((count) => Number.isInteger(count) && count > 0),
        ).toBe(true)
        expect(counts).toEqual([...counts].sort((left, right) => left - right))
        expect(new Set(counts).size).toBe(counts.length)
      }
    }
  })

  it('keeps encoded representations bounded and interaction opt-in', () => {
    for (const workload of stressConfig.workloads) {
      if (workload.lane === 'encoded') {
        expect(workload.maximumPreparedRows).toBeGreaterThan(0)
        expect(Number.isInteger(workload.maximumPreparedRows)).toBe(true)
      } else {
        expect(workload.maximumPreparedRows).toBeUndefined()
      }

      if (workload.pointer) {
        expect(workload.tier).toBe('interactive')
      }
      if (workload.pointerSweep) {
        expect(workload.pointer).toBe(true)
      }
      if (workload.multiSeries) {
        expect(workload.id).toBe('stats-multi-series-line')
        expect(workload.groupedXFocus).toBe(true)
        for (const profileName of ['quick', 'standard', 'full'] as const) {
          const shape = workload.seriesShape[profileName]
          expect(workload.sourceCounts[profileName]).toEqual([
            shape.series * shape.points,
          ])
        }
      }
      if (workload.rollingWindow) {
        expect(workload.id).toBe('rolling-keyed-window')
        expect(workload.updates).toContain('roll')
        expect(workload.stream).toBe(true)
        expect(workload.burst).toBe(true)
      }
      if (workload.instances) {
        expect(workload.id).toBe('dashboard-lines')
        expect(Object.values(workload.instances).every(Number.isInteger)).toBe(
          true,
        )
        expect(
          Object.values(workload.instances).every((count) => count > 0),
        ).toBe(true)
      }
    }
  })

  it('runs rolling windows at the intended product sizes and burst depths', () => {
    const workload = stressConfig.workloads.find(
      ({ id }) => id === 'rolling-keyed-window',
    )

    expect(workload?.sourceCounts).toEqual({
      quick: [1_000],
      standard: [1_000, 5_000],
      full: [1_000, 5_000, 10_000],
    })
    expect(stressConfig.profiles.quick.burstRevisions).toBe(16)
    expect(stressConfig.profiles.standard.burstRevisions).toBe(48)
    expect(stressConfig.profiles.full.burstRevisions).toBe(96)
  })
})
