import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  normalizeRegistryPackageMetadata,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'

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

const states = new Map()
for (const artifact of artifacts) {
  const registry = await readRegistryPackage(artifact.name, version)
  if (registry === null) {
    states.set(artifact.name, 'missing')
    continue
  }
  validateRegistryPackage(artifact, registry, true)
  states.set(artifact.name, 'published')
}

for (const artifact of artifacts) {
  if (states.get(artifact.name) === 'published') {
    console.log(`Already published: ${artifact.name}@${version}`)
    continue
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
  validateRegistryPackage(artifact, registry, true)
  console.log(`Published: ${artifact.name}@${version}`)
}

console.log(`Published ${manifest.tag} with verified integrity and provenance.`)

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
  assert.ok(lastResult, `${artifact.name}@${releaseVersion} did not appear`)
  return lastResult
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

function validateRegistryPackage(artifact, registry, requireProvenance) {
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
  if (requireProvenance) {
    assert.ok(
      hasAttestations(registry),
      `${artifact.name}@${artifact.manifest.version} lacks provenance attestations`,
    )
  }
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
