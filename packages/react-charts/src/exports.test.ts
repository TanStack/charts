// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import packageJson from '../package.json'

describe('React package exports', () => {
  it.each([
    'index.ts',
    'core.ts',
    'canvas.ts',
    'tooltip.tsx',
    'Chart.tsx',
    'CanvasChart.tsx',
    'RendererChart.tsx',
  ])('preserves the client boundary when compiling %s', (filename) => {
    const source = readFileSync(new URL(filename, import.meta.url), 'utf8')
    const { code } = transformSync(source, {
      loader: filename.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'es2022',
      jsx: 'automatic',
    })
    expect(code).toMatch(/^["']use client["'];/)
  })

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
