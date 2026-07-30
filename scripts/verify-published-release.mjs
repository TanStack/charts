import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  normalizeRegistryPackageMetadata,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'
import {
  validatePackageProvenance,
  validateReleaseEnvironment,
  validateTrustedPublishingNpmVersion,
  verifiedAttestationBundles,
} from './release-security.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '..')
const registry = 'https://registry.npmjs.org'
const { artifacts, manifest, version } =
  await validateReleaseArtifacts(repositoryRoot)

validateReleaseEnvironment({
  env: process.env,
  expectedTag: manifest.tag,
  expectedRevision: process.env.GITHUB_SHA,
})
validateTrustedPublishingNpmVersion(
  (await runNpm(['--version'], repositoryRoot)).stdout,
)

const installDirectory = await mkdtemp(
  resolve(tmpdir(), 'tanstack-charts-release-verification-'),
)
try {
  await writeFile(
    resolve(installDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'tanstack-charts-release-verification',
        version: '0.0.0',
        private: true,
        dependencies: Object.fromEntries(
          artifacts.map((artifact) => [artifact.name, version]),
        ),
      },
      null,
      2,
    )}\n`,
  )
  await runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      `--registry=${registry}`,
    ],
    installDirectory,
    true,
  )
  const signatureAudit = JSON.parse(
    (
      await runNpm(
        [
          'audit',
          'signatures',
          '--json',
          '--include-attestations',
          `--registry=${registry}`,
        ],
        installDirectory,
      )
    ).stdout,
  )
  const auditedBundles = verifiedAttestationBundles(artifacts, signatureAudit)
  console.log(
    `npm verified registry signatures and provenance for ${auditedBundles.size} release packages.`,
  )

  const lockfile = JSON.parse(
    await readFile(resolve(installDirectory, 'package-lock.json'), 'utf8'),
  )
  for (const artifact of artifacts) {
    await verifyInstalledPackage(artifact, installDirectory, lockfile)
    const metadata = await waitForRegistryMetadata(artifact)
    const attestationDocument = await waitForAttestations(
      metadata.dist.attestations.url,
    )
    assert.deepEqual(
      attestationDocument.attestations,
      auditedBundles.get(artifact.name),
      `${artifact.name} fetched attestations differ from npm's verified bundles`,
    )
    validatePackageProvenance({
      artifact,
      attestationDocument,
      revision: process.env.GITHUB_SHA,
      tag: manifest.tag,
    })
    console.log(`Verified published provenance: ${artifact.name}@${version}`)
  }
} finally {
  await rm(installDirectory, { recursive: true, force: true })
}

console.log(
  `Verified ${artifacts.length} installed packages, registry signatures, and provenance bundles for ${manifest.tag}.`,
)

async function verifyInstalledPackage(artifact, directory, lockfile) {
  const packagePath = resolve(
    directory,
    'node_modules',
    ...artifact.name.split('/'),
    'package.json',
  )
  const installedManifest = JSON.parse(await readFile(packagePath, 'utf8'))
  assert.equal(
    installedManifest.name,
    artifact.name,
    `${artifact.name} installed with the wrong name`,
  )
  assert.equal(
    installedManifest.version,
    artifact.manifest.version,
    `${artifact.name} installed at the wrong version`,
  )
  assert.deepEqual(
    installedManifest.repository,
    artifact.packedManifest.repository,
    `${artifact.name} installed with stale repository metadata`,
  )
  if (artifact.name !== '@tanstack/charts') {
    assert.equal(
      installedManifest.dependencies?.['@tanstack/charts'],
      artifact.manifest.version,
      `${artifact.name} installed with the wrong core dependency`,
    )
  }

  const lockEntry = lockfile.packages?.[`node_modules/${artifact.name}`]
  assert.equal(
    lockEntry?.version,
    artifact.manifest.version,
    `${artifact.name} lock entry has the wrong version`,
  )
  assert.equal(
    lockEntry?.integrity,
    artifact.integrity,
    `${artifact.name} installed tarball differs from the checked artifact`,
  )
}

async function waitForRegistryMetadata(artifact) {
  let lastMetadata = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const { stdout } = await runNpm(
        [
          'view',
          `${artifact.name}@${artifact.manifest.version}`,
          'name',
          'version',
          'dist.integrity',
          'dist.attestations',
          '--json',
          `--registry=${registry}`,
        ],
        repositoryRoot,
      )
      lastMetadata = normalizeRegistryPackageMetadata(JSON.parse(stdout))
      if (
        lastMetadata.name === artifact.name &&
        lastMetadata.version === artifact.manifest.version &&
        lastMetadata.dist?.integrity === artifact.integrity &&
        typeof lastMetadata.dist?.attestations?.url === 'string'
      ) {
        assertAttestationUrl(lastMetadata.dist.attestations.url)
        return lastMetadata
      }
    } catch (error) {
      if (!error?.stderr?.includes('E404')) throw error
    }
    await delay()
  }
  assert.fail(
    `${artifact.name}@${artifact.manifest.version} registry metadata did not stabilize: ${JSON.stringify(lastMetadata)}`,
  )
}

async function waitForAttestations(url) {
  assertAttestationUrl(url)
  let lastStatus = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      redirect: 'error',
    })
    lastStatus = response.status
    if (response.ok) return response.json()
    await response.body?.cancel()
    if (response.status !== 404) {
      assert.fail(`Attestation endpoint returned HTTP ${response.status}`)
    }
    await delay()
  }
  assert.fail(`Attestation endpoint did not stabilize; last HTTP ${lastStatus}`)
}

function assertAttestationUrl(value) {
  const url = new URL(value)
  assert.equal(
    url.origin,
    registry,
    'Attestation URL must use the npm registry',
  )
  assert.ok(
    url.pathname.startsWith('/-/npm/v1/attestations/'),
    'Attestation URL has an unexpected path',
  )
  assert.equal(url.search, '', 'Attestation URL must not include a query')
  assert.equal(url.hash, '', 'Attestation URL must not include a fragment')
}

function delay() {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
}

async function runNpm(args, cwd, logOutput = false) {
  const result = await execFileAsync('npm', args, {
    cwd,
    env: { ...process.env },
    maxBuffer: 50 * 1024 * 1024,
  })
  if (logOutput && result.stdout) process.stdout.write(result.stdout)
  if (logOutput && result.stderr) process.stderr.write(result.stderr)
  return result
}
