import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

const typeOnlySpecifiers = new Set(['@tanstack/charts/types'])

describe('public package exports', () => {
  it('resolves every manifest capability subpath', async () => {
    const specifiers = Object.keys(packageJson.exports).map((subpath) =>
      subpath === '.'
        ? '@tanstack/charts'
        : `@tanstack/charts${subpath.slice(1)}`,
    )
    const modules = await Promise.all(
      specifiers.map((specifier) => import(/* @vite-ignore */ specifier)),
    )

    expect(modules).toHaveLength(specifiers.length)
    expect(
      modules.every(
        (module, index) =>
          typeOnlySpecifiers.has(specifiers[index]!) ||
          Object.keys(module).length > 0,
      ),
    ).toBe(true)
  })

  it('keeps the portable barrel aligned with root authoring exports', async () => {
    const [root, portable] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/portable'),
    ])
    const browserOnlyRootValues = new Set([
      'createChartAdapter',
      'createChartRendererAdapter',
      'mountChart',
      'resolveChartAdapterLayout',
    ])

    expect(Object.keys(portable).sort()).toEqual(
      Object.keys(root)
        .filter((name) => !browserOnlyRootValues.has(name))
        .sort(),
    )
  })

  it('keeps tooltip capabilities on exact subpaths', async () => {
    const [root, tooltipModule, portalModule] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/tooltip'),
      import('@tanstack/charts/tooltip/portal'),
    ])

    expect(root).not.toHaveProperty('tooltip')
    expect(root).not.toHaveProperty('portal')
    expect(tooltipModule.tooltip.id).toBe('tooltip')
    expect(portalModule.portal.id).toBe('portal')
  })
})
