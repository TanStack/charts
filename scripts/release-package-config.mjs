import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const releaseArtifactsDirectoryName = '.release-artifacts'
export const releaseRepository = {
  type: 'git',
  url: 'https://github.com/TanStack/charts.git',
}

export const releasePackageConfigs = [
  ['charts-core', '@tanstack/charts'],
  ['react-charts', '@tanstack/react-charts'],
  ['octane-charts', '@tanstack/octane-charts'],
  ['preact-charts', '@tanstack/preact-charts'],
  ['vue-charts', '@tanstack/vue-charts'],
  ['solid-charts', '@tanstack/solid-charts'],
  ['svelte-charts', '@tanstack/svelte-charts'],
  ['angular-charts', '@tanstack/angular-charts'],
  ['lit-charts', '@tanstack/lit-charts'],
  ['alpine-charts', '@tanstack/alpine-charts'],
].map(([directory, name]) => ({ directory, name }))

export async function readReleasePackages(repositoryRoot) {
  const packages = []

  for (const config of releasePackageConfigs) {
    const manifestPath = resolve(
      repositoryRoot,
      'packages',
      config.directory,
      'package.json',
    )
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

    assert.equal(
      manifest.name,
      config.name,
      `${manifestPath} has the wrong name`,
    )
    assert.match(
      manifest.version,
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
      `${manifest.name} requires a publishable version`,
    )
    assert.equal(
      manifest.private,
      false,
      `${manifest.name} must be explicitly publishable`,
    )
    assert.equal(manifest.license, 'MIT', `${manifest.name} must include MIT`)
    assert.deepEqual(
      manifest.repository,
      {
        ...releaseRepository,
        directory: `packages/${config.directory}`,
      },
      `${manifest.name} repository metadata is stale`,
    )
    assert.equal(
      manifest.publishConfig?.access,
      'public',
      `${manifest.name} must publish publicly`,
    )
    assert.equal(
      manifest.publishConfig?.provenance,
      true,
      `${manifest.name} must publish provenance`,
    )
    assert.ok(
      manifest.publishConfig?.exports,
      `${manifest.name} requires published exports`,
    )

    if (manifest.name === '@tanstack/charts') {
      assert.equal(
        manifest.dependencies?.['@tanstack/charts'],
        undefined,
        '@tanstack/charts cannot depend on itself',
      )
    } else {
      assert.equal(
        manifest.dependencies?.['@tanstack/charts'],
        'workspace:*',
        `${manifest.name} must depend on @tanstack/charts via workspace:*`,
      )
    }

    packages.push({
      ...config,
      manifest,
      manifestPath,
      artifactFilename: `${config.directory}-${manifest.version}.tgz`,
    })
  }

  const versions = new Set(
    packages.map((packageInfo) => packageInfo.manifest.version),
  )
  assert.equal(
    versions.size,
    1,
    `Release packages must share one version: ${[...versions].join(', ')}`,
  )

  return packages
}

export function releaseTag(version) {
  return `v${version}`
}
