import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { satisfies } from 'semver'
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
  it('covers supported native peers with both bare and Expo consumers', () => {
    const bare = manifest('examples/charts-react-native').dependencies
    const expo = manifest('examples/charts-expo').dependencies
    expect(bare['react-native']).toMatch(/^0\.86\./)
    expect(expo['react-native']).toMatch(/^0\.88\./)
    expect(expo.expo).toMatch(/^~58\./)
    expect(expo['react-dom']).toBe(expo.react)
    for (const path of [
      'packages/charts-core',
      'packages/react-native-charts',
    ]) {
      const peers = manifest(path).peerDependencies
      for (const consumer of [bare, expo]) {
        for (const name of ['react', 'react-native', 'react-native-svg']) {
          expect(
            satisfies(consumer[name], peers[name]),
            `${path}: ${name}`,
          ).toBe(true)
        }
      }
      for (const unsupported of ['0.85.0', '0.87.0', '0.89.0', '1.0.0']) {
        expect(satisfies(unsupported, peers['react-native'])).toBe(false)
      }
    }
  })

  it('keeps Octane web fixtures on the workspace React pair', () => {
    const rootPeers = manifest('.').devDependencies
    for (const [path, field] of [
      ['examples/charts-octane', 'dependencies'],
      ['packages/octane-charts', 'devDependencies'],
    ]) {
      const peers = manifest(path)[field]
      expect(peers.react).toBe(rootPeers.react)
      expect(peers['react-dom']).toBe(rootPeers['react-dom'])
      const fromFixture = createRequire(resolve(root, path, 'package.json'))
      const fromOctane = createRequire(fromFixture.resolve('octane'))
      const fromRenderer = createRequire(fromOctane.resolve('react-dom'))
      expect(fromOctane('react/package.json').version).toBe(rootPeers.react)
      expect(fromRenderer('react/package.json').version).toBe(rootPeers.react)
    }
  })

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
