import { describe, expect, it, vi } from 'vitest'
import { runStressTimingPhases } from './stress-phases.mjs'

const workload = {
  id: 'raw-scatter',
  updates: ['noop', 'same', 'append', 'replace', 'reorder', 'resize'],
}
function result(phase) {
  return {
    status: 'ok',
    mount: { samples: [1, 2] },
    output: { items: 10000 },
    updates: phase.updates.map((kind) => ({ kind, samples: [3, 4] })),
    longTasks: {
      count: 1,
      totalMs: 60,
      maximumMs: 60,
      entries: [{ duration: 60 }],
    },
  }
}
describe('stress timing phase isolation', () => {
  it('rejects omitted trials and shortened sample sets', async () => {
    const omitted = await runStressTimingPhases(workload, async (phase) => ({
      ...result(phase),
      updates: [],
    }))
    expect(omitted.status).toBe('error')
    const short = await runStressTimingPhases(
      workload,
      async (phase) => ({ ...result(phase), mount: { rawSamples: [1] } }),
      20,
    )
    expect(short.status).toBe('error')
  })
  it('runs mount and every update once, retaining samples, output, and long tasks', async () => {
    const run = vi.fn(async (phase) => result(phase))
    const combined = await runStressTimingPhases(workload, run)
    expect(run.mock.calls.map(([phase]) => phase.name)).toEqual([
      'mount',
      ...workload.updates.map((kind) => `update:${kind}`),
    ])
    expect(combined.updates).toEqual(
      workload.updates.map((kind) => ({ kind, samples: [3, 4] })),
    )
    expect(combined.mount.samples).toEqual([1, 2])
    expect(combined.output.items).toBe(10000)
    expect(combined.longTasks.count).toBe(7)
    expect(combined.recovery).toBeUndefined()
  })
  it('does not mask a failed phase or continue after it', async () => {
    const run = vi.fn(async (phase) =>
      phase.name === 'update:same'
        ? { status: 'error', error: 'wrong item count' }
        : result(phase),
    )
    const combined = await runStressTimingPhases(workload, run)
    expect(combined.status).toBe('error')
    expect(combined.error).toBe('update:same: wrong item count')
    expect(run).toHaveBeenCalledTimes(3)
  })
  it('retains recovered retries from any phase', async () => {
    const combined = await runStressTimingPhases(workload, async (phase) => ({
      ...result(phase),
      ...(phase.name === 'update:append'
        ? { recovery: { attempts: 2, errors: ['timeout'], recovered: true } }
        : {}),
    }))
    expect(combined.recovery).toEqual({
      phase: 'timing',
      attempts: 2,
      errors: ['timeout'],
      recovered: true,
    })
  })
  it('leaves continuous and other workloads intact', async () => {
    const run = vi.fn(async () => ({ status: 'ok' }))
    expect(
      await runStressTimingPhases({ id: 'rolling-keyed-window' }, run),
    ).toEqual({ status: 'ok' })
    expect(run).toHaveBeenCalledExactlyOnceWith(undefined)
  })
})
