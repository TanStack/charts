import { describe, expect, it } from 'vitest'

describe('public package exports', () => {
  it('resolves every documented capability subpath', async () => {
    const modules = await Promise.all([
      import('@tanstack/charts/area'),
      import('@tanstack/charts/area-x'),
      import('@tanstack/charts/bar'),
      import('@tanstack/charts/d3/area-x'),
      import('@tanstack/charts/d3/shape'),
      import('@tanstack/charts/dom'),
      import('@tanstack/charts/dot'),
      import('@tanstack/charts/export'),
      import('@tanstack/charts/facet'),
      import('@tanstack/charts/legend'),
      import('@tanstack/charts/line'),
      import('@tanstack/charts/reconcile'),
      import('@tanstack/charts/rect'),
      import('@tanstack/charts/rule'),
      import('@tanstack/charts/runtime'),
      import('@tanstack/charts/scene'),
      import('@tanstack/charts/svg'),
      import('@tanstack/charts/text'),
    ])

    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
  })
})
