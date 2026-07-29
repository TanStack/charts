import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('React package exports', () => {
  it('resolves every manifest entry', async () => {
    const specifiers = Object.keys(packageJson.exports).map((subpath) =>
      subpath === '.'
        ? '@tanstack/react-charts'
        : `@tanstack/react-charts${subpath.slice(1)}`,
    )
    const modules = await Promise.all(
      specifiers.map((specifier) => import(/* @vite-ignore */ specifier)),
    )

    expect(modules).toHaveLength(specifiers.length)
    expect(modules.every((module) => Object.keys(module).length > 0)).toBe(true)
  })
})
