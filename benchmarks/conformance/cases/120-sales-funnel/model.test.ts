import { describe, expect, it } from 'vitest'
import { funnelStagesForRevision } from './data'
import { funnelLayout } from './model'

describe('sales funnel layout', () => {
  it('keeps every stage centered and connects adjacent widths', () => {
    const stages = funnelStagesForRevision(0)
    const layout = funnelLayout(stages)

    expect(layout.points).toHaveLength(stages.length * 2)
    for (const [index, stage] of stages.entries()) {
      const start = layout.points[index * 2]
      const end = layout.points[index * 2 + 1]
      expect(start?.x2).toBe(stage.value / 2)
      expect(start?.x1).toBe(-stage.value / 2)
      if (index < stages.length - 1) {
        expect(end?.x2).toBe(stages[index + 1]!.value / 2)
      }
    }
  })
})
