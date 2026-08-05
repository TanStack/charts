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

  it('keeps the universal barrel aligned with root authoring exports', async () => {
    const [root, universal] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
    ])
    const browserOnlyRootValues = new Set([
      'createChartAdapter',
      'createChartRendererAdapter',
      'mountChart',
      'resolveChartAdapterLayout',
    ])

    expect(Object.keys(universal).sort()).toEqual(
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

  it('keeps the cursor controller on its exact subpath', async () => {
    const [root, universal, cursorModule, cursorHostModule] = await Promise.all(
      [
        import('@tanstack/charts'),
        import('@tanstack/charts/universal'),
        import('@tanstack/charts/cursor'),
        import('@tanstack/charts/cursor/host'),
      ],
    )

    expect(root).not.toHaveProperty('createChartCursor')
    expect(universal).not.toHaveProperty('createChartCursor')
    expect(Object.keys(cursorModule).sort()).toEqual([
      'createChartCursor',
      'cursorHost',
    ])
    expect(Object.keys(cursorHostModule).sort()).toEqual([
      'createChartCursorHostSession',
      'createFocusChartCursorState',
      'createFreeChartCursorState',
      'cursorHost',
      'resolveChartCursorFocus',
      'resolveChartCursorPresentation',
      'resolveChartFocusStrategy',
      'resolveChartPointerFocus',
      'resolveFocusPresentation',
    ])
  })

  it('keeps crosshair resolution on the optional mark subpath', async () => {
    const [root, universal, crosshairModule] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/crosshair'),
    ])

    expect(root).not.toHaveProperty('resolveCrosshairGuide')
    expect(universal).not.toHaveProperty('resolveCrosshairGuide')
    expect(Object.keys(crosshairModule).sort()).toEqual([
      'crosshair',
      'resolveCrosshairGuide',
    ])
  })

  it('keeps D3 curve bridges available from barrels and exact subpaths', async () => {
    const [root, universal, shape, areaX] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/d3/shape'),
      import('@tanstack/charts/d3/area-x'),
    ])

    expect(root).toHaveProperty('d3Curve')
    expect(root).toHaveProperty('d3AreaXCurve')
    expect(universal).toHaveProperty('d3Curve')
    expect(universal).toHaveProperty('d3AreaXCurve')
    expect(shape).toHaveProperty('d3Curve')
    expect(areaX).toHaveProperty('d3AreaXCurve')
  })
})
