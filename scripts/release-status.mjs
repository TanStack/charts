import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { appendFile, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import semver from 'semver'
import { readReleasePackages, releaseTag } from './release-package-config.mjs'
import { releaseNotes } from './sync-release-changelog.mjs'

const execFileAsync = promisify(execFile)
const registry = 'https://registry.npmjs.org'
const requestTimeout = 30_000

export function classifyReleaseStatus({
  expectedRevision,
  hasPendingChangesets,
  packageStates,
  releaseExists,
  tagRevision,
}) {
  if (hasPendingChangesets) {
    return {
      createTag: false,
      dispatch: false,
      reason: 'pending-changesets',
    }
  }

  const published = packageStates.filter((state) => state === 'published')
  const missing = packageStates.filter((state) => state === 'missing')
  assert.equal(
    published.length + missing.length,
    packageStates.length,
    'Unknown package release state',
  )

  if (releaseExists) {
    assert.ok(tagRevision, 'A GitHub release requires an annotated tag')
    assert.equal(
      missing.length,
      0,
      'A GitHub release exists while npm packages are missing',
    )
    return {
      createTag: false,
      dispatch: false,
      reason: 'released',
    }
  }

  if (tagRevision !== null) {
    assert.match(
      expectedRevision ?? '',
      /^[0-9a-f]{40}$/,
      'An existing release tag requires the expected revision',
    )
    assert.equal(
      tagRevision,
      expectedRevision,
      'The existing release tag points to a different revision',
    )
  }

  return {
    createTag: tagRevision === null,
    dispatch: true,
    reason: missing.length ? 'publish' : 'finalize',
  }
}

export async function releaseStatus({
  env = process.env,
  repositoryRoot = resolve(import.meta.dirname, '..'),
} = {}) {
  const packages = await readReleasePackages(repositoryRoot)
  const version = packages[0].manifest.version
  const tag = releaseTag(version)
  releaseNotes(
    await readFile(resolve(repositoryRoot, 'CHANGELOG.md'), 'utf8'),
    version,
  )
  const pendingChangesets = (
    await readdir(resolve(repositoryRoot, '.changeset'))
  )
    .filter((entry) => entry.endsWith('.md') && entry !== 'README.md')
    .sort()

  const packageStates = await Promise.all(
    packages.map(async (packageInfo) => {
      const metadata = await readRegistryPackage(
        packageInfo.name,
        packageInfo.manifest.version,
      )
      return metadata === null ? 'missing' : 'published'
    }),
  )

  const latestVersion = await readLatestVersion(packages[0].name)
  if (
    packageStates.includes('missing') &&
    latestVersion !== null &&
    semver.gt(latestVersion, version)
  ) {
    throw new Error(
      `Refusing to release ${version}; npm already has newer ${packages[0].name}@${latestVersion}.`,
    )
  }

  const tagRevision = await readTagRevision(repositoryRoot, tag)
  const releaseExists = await githubReleaseExists(env, tag)
  const status = classifyReleaseStatus({
    expectedRevision: env.RELEASE_REVISION,
    hasPendingChangesets: pendingChangesets.length > 0,
    packageStates,
    releaseExists,
    tagRevision,
  })
  return {
    ...status,
    pendingChangesets,
    publishedPackages: packageStates.filter((state) => state === 'published')
      .length,
    tag,
    tagRevision,
    totalPackages: packages.length,
    version,
  }
}

async function readRegistryPackage(name, version) {
  const response = await fetch(
    `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(requestTimeout),
    },
  )
  if (response.status === 404) return null
  assert.equal(
    response.ok,
    true,
    `npm returned HTTP ${response.status} for ${name}@${version}`,
  )
  return response.json()
}

async function readLatestVersion(name) {
  const response = await fetch(
    `${registry}/${encodeURIComponent(name)}/latest`,
    {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(requestTimeout),
    },
  )
  if (response.status === 404) return null
  assert.equal(
    response.ok,
    true,
    `npm returned HTTP ${response.status} for ${name}@latest`,
  )
  const metadata = await response.json()
  assert.ok(
    semver.valid(metadata.version),
    `${name}@latest returned invalid version ${metadata.version}`,
  )
  return metadata.version
}

async function readTagRevision(repositoryRoot, tag) {
  const ref = `refs/tags/${tag}`
  let stdout
  try {
    ;({ stdout } = await execFileAsync(
      'git',
      ['ls-remote', '--exit-code', 'origin', ref, `${ref}^{}`],
      {
        cwd: repositoryRoot,
        env: { ...process.env },
        maxBuffer: 5 * 1024 * 1024,
      },
    ))
  } catch (error) {
    if (error?.code === 2) return null
    throw error
  }
  const revisions = new Map(
    stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = /^([0-9a-f]{40})\t(.+)$/.exec(line)
        assert.ok(match, `Invalid git ls-remote line: ${line}`)
        return [match[2], match[1]]
      }),
  )
  assert.ok(revisions.has(ref), `Remote tag ${ref} is malformed`)
  assert.ok(revisions.has(`${ref}^{}`), `Remote tag ${ref} must be annotated`)
  return revisions.get(`${ref}^{}`)
}

async function githubReleaseExists(env, tag) {
  const repository = env.GITHUB_REPOSITORY ?? 'TanStack/charts'
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        ...(env.GITHUB_TOKEN
          ? { authorization: `Bearer ${env.GITHUB_TOKEN}` }
          : {}),
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(requestTimeout),
    },
  )
  if (response.status === 404) return false
  assert.equal(
    response.ok,
    true,
    `GitHub returned HTTP ${response.status} for release ${tag}`,
  )
  return true
}

async function writeOutputs(status, outputPath) {
  const values = {
    create_tag: status.createTag,
    dispatch: status.dispatch,
    reason: status.reason,
    tag: status.tag,
    version: status.version,
  }
  const output = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  console.log(output)
  if (outputPath) await appendFile(outputPath, `${output}\n`)
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await writeOutputs(await releaseStatus(), process.env.GITHUB_OUTPUT)
}
