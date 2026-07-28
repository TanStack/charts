import { describe, expect, it } from 'vitest'
import { conformanceArtifactStem } from './conformance-artifacts.mjs'

describe('conformanceArtifactStem', () => {
  it('preserves the canonical name for an unfiltered catalog', () => {
    expect(conformanceArtifactStem()).toBe('plot-catalog')
    expect(conformanceArtifactStem([])).toBe('plot-catalog')
  })

  it('uses deterministic readable suffixes for selected cases', () => {
    const first = conformanceArtifactStem([
      '90-zoomable-time-window',
      '89-brush-range-selection',
      '90-zoomable-time-window',
    ])
    const second = conformanceArtifactStem([
      '89-brush-range-selection',
      '90-zoomable-time-window',
    ])

    expect(first).toBe(
      'plot-catalog--cases-89-brush-range-selection+90-zoomable-time-window',
    )
    expect(second).toBe(first)
  })

  it('sanitizes path syntax without creating collisions', () => {
    const stem = conformanceArtifactStem(['../Case Name', 'case-name'])

    expect(stem).toMatch(
      /^plot-catalog--cases-case-name-[a-f0-9]{12}\+case-name$/,
    )
    expect(stem).not.toMatch(/[\\/:]/)
  })

  it('bounds long case selections with a deterministic digest', () => {
    const cases = Array.from(
      { length: 20 },
      (_, index) => `${index.toString().padStart(2, '0')}-long-case-name`,
    )
    const first = conformanceArtifactStem(cases)
    const second = conformanceArtifactStem([...cases].reverse())
    const changed = conformanceArtifactStem([
      ...cases.slice(0, -1),
      'different-case',
    ])

    expect(first).toMatch(/^plot-catalog--cases-20-[a-f0-9]{12}$/)
    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first.length).toBeLessThan(80)
  })
})
