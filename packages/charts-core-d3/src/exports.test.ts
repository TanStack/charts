import { describe, expect, it } from 'vitest'

describe('public package exports', () => {
  it('resolves every documented capability subpath', async () => {
    const modules = await Promise.all([
      import('@tanstack/charts-d3/area'),
      import('@tanstack/charts-d3/bar'),
      import('@tanstack/charts-d3/curves'),
      import('@tanstack/charts-d3/dom'),
      import('@tanstack/charts-d3/dot'),
      import('@tanstack/charts-d3/export'),
      import('@tanstack/charts-d3/facet'),
      import('@tanstack/charts-d3/legend'),
      import('@tanstack/charts-d3/line'),
      import('@tanstack/charts-d3/reconcile'),
      import('@tanstack/charts-d3/rect'),
      import('@tanstack/charts-d3/rule'),
      import('@tanstack/charts-d3/runtime'),
      import('@tanstack/charts-d3/scales/color'),
      import('@tanstack/charts-d3/scales/radius'),
      import('@tanstack/charts-d3/scales/time'),
      import('@tanstack/charts-d3/scales/transforms'),
      import('@tanstack/charts-d3/scene'),
      import('@tanstack/charts-d3/spatial'),
      import('@tanstack/charts-d3/svg'),
      import('@tanstack/charts-d3/text'),
      import('@tanstack/charts-d3/transforms'),
    ])

    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
  })
})
