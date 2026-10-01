import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { planForRevision } from './data'
import { planLayout } from './plan'
import { createExampleChart } from './tanstack'
import type { PlanItem } from './plan'

describe('Gantt dependency recipe', () => {
  it.each([0, 1])(
    'gives revision %s one keyboard stop per schedule row and none to connectors',
    (revision) => {
      const plan = planLayout(planForRevision(revision))
      const scene = createChartRuntime<PlanItem>().render(
        createExampleChart({ revision }),
        { width: 640, height: 520 },
      )
      const focused = scene.points.map((point) => point.datum.id).sort()

      expect(focused).toEqual(plan.items.map((item) => item.id).sort())
      expect(scene.scales.y.domain).toEqual(plan.lanes)
    },
  )
})
