import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('public package exports', () => {
  it('resolves every manifest capability subpath', async () => {
    const specifiers = Object.keys(packageJson.exports).map((subpath) =>
      subpath === '.'
        ? '@tanstack/charts-d3'
        : `@tanstack/charts-d3${subpath.slice(1)}`,
    )
    const modules = await Promise.all(
      specifiers.map((specifier) => import(/* @vite-ignore */ specifier)),
    )

    expect(modules).toHaveLength(specifiers.length)
    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
  })
})
