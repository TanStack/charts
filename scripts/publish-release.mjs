import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  normalizeRegistryPackageMetadata,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'
import { validateTrustedPublishingNpmVersion } from './release-security.mjs'
import { releaseStatus } from './release-status.mjs'
import { runWithConcurrency } from './run-with-concurrency.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '..')
const checkOnly = process.argv.includes('--check')

assert.deepEqual(
  process.argv.slice(2).filter((argument) => argument !== '--check'),
  [],
  'Usage: node scripts/publish-release.mjs [--check]',
)

if (checkOnly) {
  const { artifacts, version } = await validateReleaseArtifacts(repositoryRoot)
  console.log(
    `Release artifact contract passed for ${artifacts.length} packages at ${version}.`,
  )
  process.exit(0)
}

validatePublishEnvironment(process.env)

const status = await releaseStatus({ repositoryRoot })
if (status.reason === 'released') {
  console.log(`No unpublished packages for ${status.tag}.`)
  process.exit(0)
}
assert.ok(
  status.reason === 'publish' || status.reason === 'finalize',
  `Changesets invoked publishing with release status ${status.reason}`,
)

validateTrustedPublishingNpmVersion((await runNpm(['--version'])).stdout)
await buildReleaseArtifacts()

const { artifacts, manifest, version } =
  await validateReleaseArtifacts(repositoryRoot)
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

const unpublishedArtifacts = artifacts.filter(
  (artifact) => states.get(artifact.name) === 'missing',
)
if (status.reason === 'finalize') {
  assert.equal(
    unpublishedArtifacts.length,
    0,
    `${manifest.tag} cannot finalize with unpublished packages`,
  )
  console.log(
    `Verified ${manifest.tag} registry integrity and attestations before finalization.`,
  )
  process.exit(0)
}

const coreArtifact = artifacts.find(
  (artifact) => artifact.name === '@tanstack/charts',
)
assert.ok(coreArtifact, 'Release artifacts must include @tanstack/charts')
const reactArtifact = artifacts.find(
  (artifact) => artifact.name === '@tanstack/react-charts',
)
assert.ok(
  reactArtifact,
  'Release artifacts must include @tanstack/react-charts',
)
await publishArtifact(coreArtifact)
await publishArtifact(reactArtifact)
await runWithConcurrency(
  artifacts.filter(
    (artifact) => artifact !== coreArtifact && artifact !== reactArtifact,
  ),
  3,
  publishArtifact,
)

console.log(`Published ${manifest.tag} with verified integrity and provenance.`)
for (const artifact of unpublishedArtifacts) {
  console.log(`New tag: ${artifact.name}@${version}`)
}

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
  states.set(artifact.name, 'published')
  console.log(`Published: ${artifact.name}@${version}`)
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

function validatePublishEnvironment(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Publishing requires GitHub Actions')
  assert.equal(env.GITHUB_EVENT_NAME, 'push', 'Publishing requires a push')
  assert.equal(env.GITHUB_REF_TYPE, 'branch', 'Publishing requires a branch')
  assert.equal(env.GITHUB_REF_NAME, 'main', 'Publishing requires main')
  assert.equal(
    env.GITHUB_REF,
    'refs/heads/main',
    'Publishing requires refs/heads/main',
  )
  assert.equal(
    env.GITHUB_REPOSITORY,
    'TanStack/charts',
    'Publishing requires TanStack/charts',
  )
  assert.match(
    env.GITHUB_SHA ?? '',
    /^[0-9a-f]{40}$/,
    'Publishing requires an exact GitHub revision',
  )
  assert.equal(
    env.RELEASE_REVISION,
    env.GITHUB_SHA,
    'Release revision differs from GITHUB_SHA',
  )
}

function buildReleaseArtifacts() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolve(repositoryRoot, 'scripts/build-release-artifacts.mjs')],
      {
        cwd: repositoryRoot,
        env: { ...process.env, CI: 'true' },
        stdio: 'inherit',
      },
    )
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(
        new Error(
          `Release artifact build exited with ${code ?? `signal ${signal ?? 'unknown'}`}`,
        ),
      )
    })
  })
}
