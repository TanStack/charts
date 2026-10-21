import { describe, expect, it } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { createExampleChart } from './example'
import { storesForRevision } from './data'
import type { Store } from './data'
import { referenceLots } from './transform'

describe('city catalog definition', () => {
  it('preserves the public datum contract and matches the independent top-view layout', () => {
    const scene = createChartRuntime<Store, number, number>().render(
      createExampleChart({ revision: 0 }),
      { width: 640, height: 480 },
    )
    const expected = referenceLots(storesForRevision(0))
    expect(scene.points).toHaveLength(140)
    expect(
      scene.points.map((point) => [point.datum.id, point.xValue, point.yValue]),
    ).toEqual(expected.map((row) => [row.id, row.x, row.z]))
    expect(scene.points[0]?.datum.metric.label).toBe('Orders')
  })
})
