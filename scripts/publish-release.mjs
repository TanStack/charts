import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  normalizeRegistryPackageMetadata,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'
import { validateTrustedPublishingNpmVersion } from './release-security.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '..')
const checkOnly = process.argv.includes('--check')

assert.deepEqual(
  process.argv.slice(2).filter((argument) => argument !== '--check'),
  [],
  'Usage: node scripts/publish-release.mjs [--check]',
)

const { artifacts, manifest, version } =
  await validateReleaseArtifacts(repositoryRoot)

if (checkOnly) {
  console.log(
    `Release artifact contract passed for ${artifacts.length} packages at ${version}.`,
  )
  process.exit(0)
}

assert.equal(
  process.env.GITHUB_ACTIONS,
  'true',
  'Publishing is restricted to GitHub Actions',
)
assert.equal(
  process.env.GITHUB_REF_TYPE,
  'tag',
  'Publishing requires a tag event',
)
assert.equal(
  process.env.GITHUB_REF_NAME,
  manifest.tag,
  `Expected release tag ${manifest.tag}`,
)
assert.match(
  process.env.GITHUB_SHA ?? '',
  /^[0-9a-f]{40}$/,
  'Publishing requires an exact GitHub revision',
)
validateTrustedPublishingNpmVersion((await runNpm(['--version'])).stdout)

const states = new Map()
await Promise.all(
  artifacts.map(async (artifact) => {
    const registry = await readRegistryPackage(artifact.name, version)
    if (registry === null) {
      states.set(artifact.name, 'missing')
      return
    }
    validateRegistryPackage(artifact, registry)
    states.set(artifact.name, 'published')
  }),
)

const coreArtifact = artifacts.find(
  (artifact) => artifact.name === '@tanstack/charts',
)
assert.ok(coreArtifact, 'Release artifacts must include @tanstack/charts')
await publishArtifact(coreArtifact)
await runWithConcurrency(
  artifacts.filter((artifact) => artifact !== coreArtifact),
  3,
  publishArtifact,
)

console.log(`Published ${manifest.tag} with verified integrity and provenance.`)

async function publishArtifact(artifact) {
  if (states.get(artifact.name) === 'published') {
    console.log(`Already published: ${artifact.name}@${version}`)
    return
  }

  await runNpm([
    'publish',
    artifact.tarball,
    '--access',
    'public',
    '--tag',
    'latest',
    '--provenance',
  ])
  const registry = await waitForRegistryPackage(artifact, version)
  validateRegistryPackage(artifact, registry)
  console.log(`Published: ${artifact.name}@${version}`)
}

async function runWithConcurrency(values, concurrency, operation) {
  let nextIndex = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex
        nextIndex += 1
        await operation(values[index])
      }
    }),
  )
}

async function waitForRegistryPackage(artifact, releaseVersion) {
  let lastResult = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    lastResult = await readRegistryPackage(artifact.name, releaseVersion)
    if (
      lastResult?.dist?.integrity === artifact.integrity &&
      hasAttestations(lastResult)
    ) {
      return lastResult
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
  }
  assert.fail(
    `${artifact.name}@${releaseVersion} registry metadata did not stabilize after 120 seconds ` +
      `(integrity: ${lastResult?.dist?.integrity ?? 'missing'}; provenance: ${hasAttestations(lastResult) ? 'present' : 'missing'})`,
  )
}

async function readRegistryPackage(name, releaseVersion) {
  try {
    const { stdout } = await runNpm([
      'view',
      `${name}@${releaseVersion}`,
      'name',
      'version',
      'dist.integrity',
      'dist.attestations',
      '--json',
    ])
    return normalizeRegistryPackageMetadata(JSON.parse(stdout))
  } catch (error) {
    if (error?.stderr?.includes('E404')) return null
    throw error
  }
}

function validateRegistryPackage(artifact, registry) {
  assert.equal(
    registry.name,
    artifact.name,
    `${artifact.name} registry name differs`,
  )
  assert.equal(
    registry.version,
    artifact.manifest.version,
    `${artifact.name} registry version differs`,
  )
  assert.equal(
    registry.dist?.integrity,
    artifact.integrity,
    `${artifact.name}@${artifact.manifest.version} already exists with different contents`,
  )
  assert.ok(
    hasAttestations(registry),
    `${artifact.name}@${artifact.manifest.version} lacks provenance attestations`,
  )
}

function hasAttestations(registry) {
  return (
    registry?.dist?.attestations !== undefined &&
    registry.dist.attestations !== null
  )
}

function runNpm(args) {
  return execFileAsync('npm', args, {
    cwd: repositoryRoot,
    env: { ...process.env },
    maxBuffer: 20 * 1024 * 1024,
  })
}
