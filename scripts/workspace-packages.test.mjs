import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readReleasePackages } from './release-package-config.mjs'

const root = resolve(import.meta.dirname, '..')
const manifest = (path) =>
  JSON.parse(readFileSync(resolve(root, path, 'package.json'), 'utf8'))
const internalPackages = [
  ['examples/charts-expo', 'expo-example'],
  ['examples/charts-octane', 'octane-example'],
  ['examples/charts-react-native', 'react-native-example'],
  ['examples/charts-react', 'react-example'],
  ['examples/conformance', 'conformance-example'],
  ['examples/sandbox', 'sandbox'],
  ['packages/charts-fixtures', 'fixtures'],
  ['packages/react-18-compat', 'react-18-compat'],
]

describe('workspace package boundaries', () => {
  it.each(internalPackages)(
    'keeps %s private under the internal scope',
    (path, suffix) => {
      expect(manifest(path)).toMatchObject({
        name: `@charts-internal/${suffix}`,
        private: true,
      })
    },
  )

  it('keeps the root workspace private', () => {
    expect(manifest('.')).toMatchObject({
      name: 'tanstack-charts',
      private: true,
    })
  })

  it('preserves the private demo-data package name', () => {
    expect(manifest('packages/charts-demo-data')).toMatchObject({
      name: '@tanstack/charts-data',
      private: true,
    })
  })

  it('preserves the twelve public package names', async () => {
    const packages = await readReleasePackages(root)
    expect(packages.map((p) => p.name).sort()).toEqual([
      '@tanstack/alpine-charts',
      '@tanstack/angular-charts',
      '@tanstack/charts',
      '@tanstack/charts-scales',
      '@tanstack/lit-charts',
      '@tanstack/octane-charts',
      '@tanstack/preact-charts',
      '@tanstack/react-charts',
      '@tanstack/react-native-charts',
      '@tanstack/solid-charts',
      '@tanstack/svelte-charts',
      '@tanstack/vue-charts',
    ])
  })

  it('keeps the research package and demo removals intact', () => {
    for (const name of [
      'core',
      'plot',
      'react',
      'octane',
      'fixtures',
      'charts-core-d3',
    ]) {
      expect(existsSync(resolve(root, 'packages', name, 'package.json'))).toBe(
        false,
      )
    }
    for (const name of ['react', 'octane']) {
      expect(existsSync(resolve(root, 'examples', name, 'package.json'))).toBe(
        false,
      )
    }
  })
})
