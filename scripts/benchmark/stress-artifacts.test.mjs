import { describe, expect, it } from 'vitest'
import { stressArtifactStem } from './stress-artifacts.mjs'

describe('stressArtifactStem', () => {
  it('preserves the canonical name for an unfiltered profile', () => {
    expect(stressArtifactStem('quick', { libraries: [], workloads: [] })).toBe(
      'stress-quick',
    )
  })

  it('uses deterministic readable suffixes for selected filters', () => {
    const first = stressArtifactStem('quick', {
      libraries: ['echarts', 'chartjs', 'echarts'],
      workloads: ['stats-multi-series-line', 'raw-line'],
    })
    const second = stressArtifactStem('quick', {
      libraries: ['chartjs', 'echarts'],
      workloads: ['raw-line', 'stats-multi-series-line'],
    })

    expect(first).toBe(
      'stress-quick--libraries-chartjs+echarts--workloads-raw-line+stats-multi-series-line',
    )
    expect(second).toBe(first)
  })

  it('sanitizes path syntax without creating collisions', () => {
    const stem = stressArtifactStem('../Quick Profile', {
      libraries: ['@scope/chart.js', 'scope-chart.js'],
      workloads: [],
    })

    expect(stem).toMatch(
      /^stress-quick-profile-[a-f0-9]{12}--libraries-scope-chart\.js-[a-f0-9]{12}\+scope-chart\.js$/,
    )
    expect(stem).not.toMatch(/[\\/:]/)
  })

  it('bounds long filter suffixes with a deterministic digest', () => {
    const workloads = Array.from(
      { length: 20 },
      (_, index) => `long-workload-name-${index.toString().padStart(2, '0')}`,
    )
    const first = stressArtifactStem('full', {
      libraries: [],
      workloads,
    })
    const second = stressArtifactStem('full', {
      libraries: [],
      workloads: [...workloads].reverse(),
    })
    const changed = stressArtifactStem('full', {
      libraries: [],
      workloads: [...workloads.slice(0, -1), 'different-workload'],
    })

    expect(first).toMatch(/^stress-full--workloads-20-[a-f0-9]{12}$/)
    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first.length).toBeLessThan(80)
  })
})
