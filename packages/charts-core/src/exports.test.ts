import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

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
    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
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
