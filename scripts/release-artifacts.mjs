import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  readReleasePackages,
  releaseArtifactsDirectoryName,
  releaseTag,
} from './release-package-config.mjs'

const execFileAsync = promisify(execFile)
const packedEntryFields = [
  'main',
  'module',
  'browser',
  'types',
  'typings',
  'svelte',
  'style',
]

export async function createReleaseArtifactManifest(repositoryRoot) {
  const packages = await readReleasePackages(repositoryRoot)
  const artifactDirectory = resolve(
    repositoryRoot,
    releaseArtifactsDirectoryName,
  )
  const entries = []

  for (const packageInfo of packages) {
    const tarball = resolve(artifactDirectory, packageInfo.artifactFilename)
    const integrity = await tarballIntegrity(tarball)
    const packedManifest = await readPackedManifest(tarball)
    const packedFiles = await readPackedFiles(tarball)
    validatePackedManifest(packageInfo, packedManifest, packedFiles)
    entries.push({
      name: packageInfo.name,
      directory: packageInfo.directory,
      filename: packageInfo.artifactFilename,
      integrity,
    })
  }

  const version = packages[0].manifest.version
  const manifest = {
    schemaVersion: 1,
    version,
    tag: releaseTag(version),
    packages: entries,
  }
  await writeFile(
    resolve(artifactDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  return { artifactDirectory, manifest, packages }
}

export async function validateReleaseArtifacts(repositoryRoot) {
  const packages = await readReleasePackages(repositoryRoot)
  const artifactDirectory = resolve(
    repositoryRoot,
    releaseArtifactsDirectoryName,
  )
  const manifest = JSON.parse(
    await readFile(resolve(artifactDirectory, 'manifest.json'), 'utf8'),
  )
  const version = packages[0].manifest.version

  assert.equal(manifest.schemaVersion, 1, 'Release artifact schema is stale')
  assert.equal(manifest.version, version, 'Release artifact version is stale')
  assert.equal(
    manifest.tag,
    releaseTag(version),
    'Release artifact tag is stale',
  )
  assert.equal(
    manifest.packages?.length,
    packages.length,
    'Release artifact package count is stale',
  )

  const artifacts = []
  for (const [index, packageInfo] of packages.entries()) {
    const entry = manifest.packages[index]
    assert.deepEqual(
      {
        name: entry?.name,
        directory: entry?.directory,
        filename: entry?.filename,
      },
      {
        name: packageInfo.name,
        directory: packageInfo.directory,
        filename: packageInfo.artifactFilename,
      },
      `Release artifact order is stale at ${packageInfo.name}`,
    )
    assert.equal(
      basename(entry.filename),
      entry.filename,
      `${packageInfo.name} artifact must stay inside the artifact directory`,
    )

    const tarball = resolve(artifactDirectory, entry.filename)
    const integrity = await tarballIntegrity(tarball)
    assert.equal(
      entry.integrity,
      integrity,
      `${packageInfo.name} artifact integrity changed`,
    )
    const packedManifest = await readPackedManifest(tarball)
    const packedFiles = await readPackedFiles(tarball)
    validatePackedManifest(packageInfo, packedManifest, packedFiles)
    artifacts.push({
      ...packageInfo,
      tarball,
      integrity,
      packedManifest,
    })
  }

  return { artifactDirectory, artifacts, manifest, version }
}

export function normalizeRegistryPackageMetadata(metadata) {
  if (metadata?.dist) return metadata
  return {
    ...metadata,
    dist: {
      integrity: metadata?.['dist.integrity'],
      attestations: metadata?.['dist.attestations'],
    },
  }
}

async function tarballIntegrity(tarball) {
  const contents = await readFile(tarball)
  return `sha512-${createHash('sha512').update(contents).digest('base64')}`
}

async function readPackedManifest(tarball) {
  const { stdout } = await execFileAsync(
    'tar',
    ['-xzOf', tarball, 'package/package.json'],
    { maxBuffer: 5 * 1024 * 1024 },
  )
  return JSON.parse(stdout)
}

async function readPackedFiles(tarball) {
  const { stdout } = await execFileAsync('tar', ['-tzf', tarball], {
    maxBuffer: 5 * 1024 * 1024,
  })
  return new Set(
    stdout
      .split('\n')
      .filter(Boolean)
      .map((file) => file.replace(/^package\//, '')),
  )
}

function validatePackedManifest(packageInfo, packedManifest, packedFiles) {
  const { manifest } = packageInfo
  assert.equal(
    packedManifest.name,
    manifest.name,
    `${manifest.name} packed the wrong name`,
  )
  assert.equal(
    packedManifest.version,
    manifest.version,
    `${manifest.name} packed the wrong version`,
  )
  assert.equal(
    packedManifest.private,
    false,
    `${manifest.name} packed as private`,
  )
  assert.deepEqual(
    packedManifest.repository,
    manifest.repository,
    `${manifest.name} packed stale repository metadata`,
  )
  assert.deepEqual(
    packedManifest.exports,
    manifest.publishConfig.exports,
    `${manifest.name} packed stale exports`,
  )
  assert.equal(
    packedManifest.publishConfig?.exports,
    undefined,
    `${manifest.name} retained source export overrides`,
  )
  assert.equal(
    packedManifest.publishConfig?.access,
    'public',
    `${manifest.name} packed without public access`,
  )
  assert.equal(
    packedManifest.publishConfig?.provenance,
    true,
    `${manifest.name} packed without provenance`,
  )
  validatePackedEntryFiles(manifest.name, packedManifest, packedFiles)

  for (const range of Object.values(packedManifest.dependencies ?? {})) {
    assert.equal(
      range.startsWith('workspace:'),
      false,
      `${manifest.name} retained workspace dependency ${range}`,
    )
  }

  if (
    manifest.name !== '@tanstack/charts' &&
    manifest.name !== '@tanstack/charts-scales'
  ) {
    assert.equal(
      packedManifest.dependencies?.['@tanstack/charts'],
      manifest.version,
      `${manifest.name} must pin @tanstack/charts@${manifest.version}`,
    )
  }
}

export function validatePackedEntryFiles(
  packageName,
  packedManifest,
  packedFiles,
) {
  for (const field of packedEntryFields) {
    const target = packedManifest[field]
    if (target === undefined) continue
    if (field === 'browser' && typeof target === 'object' && target !== null) {
      continue
    }
    assert.equal(
      typeof target,
      'string',
      `${packageName} packed ${field} entry must identify one file`,
    )
    assert.ok(
      packedFiles.has(target.replace(/^\.\//, '')),
      `${packageName} packed ${field} entry is missing from tarball: ${target}`,
    )
  }
}
