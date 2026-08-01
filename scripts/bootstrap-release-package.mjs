import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  normalizeRegistryPackageMetadata,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'
import {
  readReleasePackages,
  releaseArtifactsDirectoryName,
} from './release-package-config.mjs'
import { validateTrustedPublishingNpmVersion } from './release-security.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '..')
const bootstrapPlanPath = resolve(
  repositoryRoot,
  releaseArtifactsDirectoryName,
  'bootstrap-plan.json',
)
const command = process.argv[2]

if (process.argv[1] === import.meta.filename) {
  assert.ok(
    command === 'prepare' || command === 'publish',
    'Usage: node scripts/bootstrap-release-package.mjs <prepare|publish>',
  )
  assert.equal(process.argv.length, 3, 'Bootstrap command accepts no arguments')
  validateBootstrapEnvironment(process.env)
  await validateCheckedOutRevision()

  if (command === 'prepare') {
    await prepareBootstrapPackage()
  } else {
    await publishBootstrapPackage()
  }
}

export function validateBootstrapEnvironment(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Bootstrap requires GitHub Actions')
  assert.equal(
    env.GITHUB_EVENT_NAME,
    'workflow_dispatch',
    'Bootstrap requires workflow_dispatch',
  )
  assert.equal(env.GITHUB_REF_TYPE, 'branch', 'Bootstrap requires a branch')
  assert.equal(env.GITHUB_REF_NAME, 'main', 'Bootstrap requires main')
  assert.equal(
    env.GITHUB_REF,
    'refs/heads/main',
    'Bootstrap requires refs/heads/main',
  )
  assert.equal(
    env.GITHUB_REPOSITORY,
    'TanStack/charts',
    'Bootstrap requires TanStack/charts',
  )
  assert.match(
    env.GITHUB_SHA ?? '',
    /^[0-9a-f]{40}$/,
    'Bootstrap requires an exact GitHub revision',
  )
  assert.equal(
    env.RELEASE_REVISION,
    env.GITHUB_SHA,
    'Bootstrap revision differs from GITHUB_SHA',
  )
  assert.ok(
    env.BOOTSTRAP_PACKAGE_SPEC,
    'Bootstrap requires an exact package@version confirmation',
  )
}

export function selectBootstrapCandidate({
  artifacts,
  expectedSpec,
  registryPackages,
}) {
  const expectedArtifact = artifacts.find(
    (artifact) => packageSpec(artifact) === expectedSpec,
  )
  assert.ok(
    expectedArtifact,
    `${expectedSpec} is not the exact fixed-set package and version`,
  )

  const missing = artifacts.filter(
    (artifact) => registryPackages.get(artifact.name) === null,
  )
  assert.ok(
    missing.length <= 1,
    `Bootstrap requires exactly one missing fixed-set package; missing: ${missing
      .map(packageSpec)
      .join(', ')}`,
  )

  for (const artifact of artifacts) {
    const registry = registryPackages.get(artifact.name)
    assert.notEqual(
      registry,
      undefined,
      `Registry state is missing for ${packageSpec(artifact)}`,
    )
    if (registry === null) continue
    validatePublishedFixedPackage(artifact, registry)
  }

  if (missing.length === 0) {
    validatePublishedArtifact(
      expectedArtifact,
      registryPackages.get(expectedArtifact.name),
    )
    validateBootstrapDependencies(expectedArtifact, artifacts, registryPackages)
    return { artifact: expectedArtifact, publishNeeded: false }
  }

  assert.equal(
    packageSpec(missing[0]),
    expectedSpec,
    `Confirmation differs from the missing fixed-set package ${packageSpec(missing[0])}`,
  )
  validateBootstrapDependencies(missing[0], artifacts, registryPackages)
  return { artifact: missing[0], publishNeeded: true }
}

export function validateFixedReleaseSet(releasePackages, changesetConfig) {
  const packageNames = releasePackages.map((packageInfo) => packageInfo.name)
  assert.deepEqual(
    changesetConfig.fixed,
    [packageNames],
    'Changesets fixed set differs from releasePackageConfigs',
  )
  return packageNames
}

async function prepareBootstrapPackage() {
  await buildReleaseArtifacts()
  const state = await readBootstrapState()
  const selection = selectBootstrapCandidate({
    ...state,
    expectedSpec: process.env.BOOTSTRAP_PACKAGE_SPEC,
  })
  const plan = {
    schemaVersion: 1,
    revision: process.env.GITHUB_SHA,
    package: selection.artifact.name,
    version: selection.artifact.manifest.version,
    filename: selection.artifact.artifactFilename,
    integrity: selection.artifact.integrity,
  }
  await writeFile(bootstrapPlanPath, `${JSON.stringify(plan, null, 2)}\n`)
  await writeWorkflowOutputs({
    package: plan.package,
    version: plan.version,
    publish_needed: String(selection.publishNeeded),
  })

  if (selection.publishNeeded) {
    console.log(
      `Prepared the sole missing package ${packageSpec(selection.artifact)}.`,
    )
  } else {
    console.log(
      `Already published with matching integrity and provenance: ${packageSpec(selection.artifact)}`,
    )
  }
}

async function publishBootstrapPackage() {
  const { artifacts } = await validateReleaseArtifacts(repositoryRoot)
  await assertFixedReleaseSet()
  const plan = JSON.parse(await readFile(bootstrapPlanPath, 'utf8'))
  assert.deepEqual(
    {
      schemaVersion: plan.schemaVersion,
      revision: plan.revision,
      package: plan.package,
      version: plan.version,
    },
    {
      schemaVersion: 1,
      revision: process.env.GITHUB_SHA,
      package: expectedPackage().name,
      version: expectedPackage().manifest.version,
    },
    'Bootstrap plan does not match this exact workflow revision and confirmation',
  )

  const plannedArtifact = artifacts.find(
    (artifact) => artifact.name === plan.package,
  )
  assert.ok(
    plannedArtifact,
    `Bootstrap artifact is missing for ${plan.package}`,
  )
  assert.equal(
    plannedArtifact.artifactFilename,
    plan.filename,
    'Bootstrap artifact filename changed after preparation',
  )
  assert.equal(
    plannedArtifact.integrity,
    plan.integrity,
    'Bootstrap artifact changed after preparation',
  )

  const state = await readBootstrapState(artifacts)
  const selection = selectBootstrapCandidate({
    ...state,
    expectedSpec: process.env.BOOTSTRAP_PACKAGE_SPEC,
  })
  assert.equal(
    selection.artifact.name,
    plan.package,
    'Bootstrap candidate changed after preparation',
  )
  if (!selection.publishNeeded) {
    console.log(
      `Already published with matching integrity and provenance: ${packageSpec(selection.artifact)}`,
    )
    return
  }

  assert.ok(process.env.NODE_AUTH_TOKEN, 'Bootstrap npm token is missing')
  validateTrustedPublishingNpmVersion((await runNpm(['--version'])).stdout)
  await publishArtifact(selection.artifact, process.env.NODE_AUTH_TOKEN)
  const registry = await waitForRegistryPackage(selection.artifact)
  validatePublishedArtifact(selection.artifact, registry)
  console.log(
    `Published ${packageSpec(selection.artifact)} with verified integrity and provenance.`,
  )
}

async function readBootstrapState(existingArtifacts) {
  const artifacts =
    existingArtifacts ??
    (await validateReleaseArtifacts(repositoryRoot)).artifacts
  await assertFixedReleaseSet()
  const registryPackages = new Map()
  await Promise.all(
    artifacts.map(async (artifact) => {
      registryPackages.set(
        artifact.name,
        await readRegistryPackage(artifact.name, artifact.manifest.version),
      )
    }),
  )
  return { artifacts, registryPackages }
}

async function assertFixedReleaseSet() {
  const releasePackages = await readReleasePackages(repositoryRoot)
  const changesetConfig = JSON.parse(
    await readFile(resolve(repositoryRoot, '.changeset/config.json'), 'utf8'),
  )
  validateFixedReleaseSet(releasePackages, changesetConfig)
}

async function validateCheckedOutRevision() {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    env: publicRegistryEnvironment(process.env),
  })
  assert.equal(
    stdout.trim(),
    process.env.GITHUB_SHA,
    'Checked-out revision differs from GITHUB_SHA',
  )
}

function expectedPackage() {
  const match = process.env.BOOTSTRAP_PACKAGE_SPEC.match(
    /^(@[^/\s]+\/[^@/\s]+)@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/,
  )
  assert.ok(
    match,
    'Bootstrap confirmation must be an exact scoped package@version',
  )
  return { name: match[1], manifest: { version: match[2] } }
}

function validateBootstrapDependencies(artifact, artifacts, registryPackages) {
  const fixedPackages = new Map(
    artifacts.map((candidate) => [candidate.name, candidate]),
  )
  for (const [name, version] of Object.entries(
    artifact.packedManifest.dependencies ?? {},
  )) {
    const dependency = fixedPackages.get(name)
    if (!dependency) continue
    assert.equal(
      version,
      artifact.manifest.version,
      `${packageSpec(artifact)} must pin ${name}@${artifact.manifest.version}`,
    )
    const registry = registryPackages.get(name)
    assert.ok(
      registry,
      `${packageSpec(artifact)} requires published dependency ${name}@${version}`,
    )
    validatePublishedFixedPackage(dependency, registry)
  }
}

function validatePublishedFixedPackage(artifact, registry) {
  assert.equal(
    registry.name,
    artifact.name,
    `${artifact.name} registry name differs`,
  )
  assert.equal(
    registry.version,
    artifact.manifest.version,
    `${packageSpec(artifact)} registry version differs`,
  )
  assert.ok(
    hasAttestations(registry),
    `${packageSpec(artifact)} lacks provenance attestations`,
  )
}

function validatePublishedArtifact(artifact, registry) {
  validatePublishedFixedPackage(artifact, registry)
  assert.equal(
    registry.dist?.integrity,
    artifact.integrity,
    `${packageSpec(artifact)} exists with different contents`,
  )
}

async function readRegistryPackage(name, version) {
  try {
    const { stdout } = await runNpm([
      'view',
      `${name}@${version}`,
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

async function waitForRegistryPackage(artifact) {
  let lastResult = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    lastResult = await readRegistryPackage(
      artifact.name,
      artifact.manifest.version,
    )
    if (
      lastResult?.dist?.integrity === artifact.integrity &&
      hasAttestations(lastResult)
    ) {
      return lastResult
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
  }
  assert.fail(
    `${packageSpec(artifact)} registry metadata did not stabilize after 120 seconds ` +
      `(integrity: ${lastResult?.dist?.integrity ?? 'missing'}; provenance: ${hasAttestations(lastResult) ? 'present' : 'missing'})`,
  )
}

async function publishArtifact(artifact, token) {
  const npmDirectory = await mkdtemp(resolve(tmpdir(), 'charts-npm-bootstrap-'))
  const userConfig = resolve(npmDirectory, 'npmrc')
  try {
    await writeFile(userConfig, `//registry.npmjs.org/:_authToken=${token}\n`, {
      mode: 0o600,
    })
    await runNpm(
      [
        'publish',
        artifact.tarball,
        '--access',
        'public',
        '--tag',
        'latest',
        '--provenance',
      ],
      { NPM_CONFIG_USERCONFIG: userConfig },
    )
  } finally {
    await rm(npmDirectory, { recursive: true, force: true })
  }
}

function runNpm(args, extraEnv = {}) {
  return execFileAsync('npm', args, {
    cwd: repositoryRoot,
    env: { ...publicRegistryEnvironment(process.env), ...extraEnv },
    maxBuffer: 20 * 1024 * 1024,
  })
}

function publicRegistryEnvironment(env) {
  const sanitized = { ...env }
  delete sanitized.NODE_AUTH_TOKEN
  delete sanitized.NPM_TOKEN
  delete sanitized.NPM_CONFIG_USERCONFIG
  return sanitized
}

function buildReleaseArtifacts() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolve(repositoryRoot, 'scripts/build-release-artifacts.mjs')],
      {
        cwd: repositoryRoot,
        env: { ...publicRegistryEnvironment(process.env), CI: 'true' },
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

async function writeWorkflowOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return
  for (const [name, value] of Object.entries(outputs)) {
    assert.match(name, /^[a-z_]+$/)
    assert.doesNotMatch(value, /[\r\n]/)
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
  }
}

function packageSpec(artifact) {
  return `${artifact.name}@${artifact.manifest.version}`
}

function hasAttestations(registry) {
  return (
    registry?.dist?.attestations !== undefined &&
    registry.dist.attestations !== null
  )
}
