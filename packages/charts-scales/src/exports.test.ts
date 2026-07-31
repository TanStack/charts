import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('compact scale exports', () => {
  it('resolves only exact family subpaths', async () => {
    const specifiers = Object.keys(packageJson.exports).map(
      (subpath) => `@tanstack/charts-scales${subpath.slice(1)}`,
    )
    const modules = await Promise.all(
      specifiers.map((specifier) => import(/* @vite-ignore */ specifier)),
    )

    expect(Object.hasOwn(packageJson.exports, '.')).toBe(false)
    expect(modules).toHaveLength(4)
    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
  })
})
