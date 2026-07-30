import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { readReleasePackages, releaseTag } from './release-package-config.mjs'
import {
  releaseRepositoryUrl,
  validateReleaseEnvironment,
} from './release-security.mjs'

const execFileAsync = promisify(execFile)

export function parseRemoteRefs(output) {
  const refs = new Map()
  for (const line of output.trim().split('\n')) {
    if (!line) continue
    const match = /^([0-9a-f]{40})\t(.+)$/.exec(line)
    assert.ok(match, `Invalid git ls-remote line: ${line}`)
    assert.equal(refs.has(match[2]), false, `Duplicate remote ref ${match[2]}`)
    refs.set(match[2], match[1])
  }
  return refs
}

export function validateReleaseRevisionEvidence({
  headRevision,
  mainRevision,
  remoteRefs,
  revision,
  tag,
  isMainAncestor,
}) {
  const tagRef = `refs/tags/${tag}`
  assert.equal(
    headRevision,
    revision,
    `Checked-out revision ${headRevision} differs from ${revision}`,
  )
  assert.match(mainRevision, /^[0-9a-f]{40}$/, 'Remote main is not a commit')
  assert.ok(remoteRefs.has(tagRef), `Remote tag ${tagRef} does not exist`)
  assert.ok(
    remoteRefs.has(`${tagRef}^{}`),
    `Remote tag ${tagRef} must be annotated`,
  )
  assert.equal(
    remoteRefs.get(`${tagRef}^{}`),
    revision,
    `Remote tag ${tagRef} peels to the wrong commit`,
  )
  assert.equal(
    isMainAncestor,
    true,
    `Release revision ${revision} is not on remote main ${mainRevision}`,
  )
}

export async function verifyReleaseRevision({
  env = process.env,
  repositoryRoot = resolve(import.meta.dirname, '..'),
} = {}) {
  const packages = await readReleasePackages(repositoryRoot)
  const expectedTag = releaseTag(packages[0].manifest.version)
  const revision = env.GITHUB_SHA
  validateReleaseEnvironment({ env, expectedTag, expectedRevision: revision })

  const remoteUrl = (
    await runGit(repositoryRoot, ['remote', 'get-url', 'origin'])
  ).trim()
  assert.ok(
    remoteUrl === releaseRepositoryUrl ||
      remoteUrl === `${releaseRepositoryUrl}.git`,
    `origin is ${remoteUrl}, expected ${releaseRepositoryUrl}`,
  )

  await runGit(repositoryRoot, [
    'fetch',
    '--no-tags',
    'origin',
    'refs/heads/main',
  ])
  const mainRevision = (
    await runGit(repositoryRoot, ['rev-parse', 'FETCH_HEAD^{commit}'])
  ).trim()
  const tagRef = `refs/tags/${expectedTag}`
  const remoteRefs = parseRemoteRefs(
    await runGit(repositoryRoot, [
      'ls-remote',
      '--exit-code',
      'origin',
      tagRef,
      `${tagRef}^{}`,
    ]),
  )
  const headRevision = (
    await runGit(repositoryRoot, ['rev-parse', 'HEAD^{commit}'])
  ).trim()
  const isMainAncestor = await gitSucceeds(repositoryRoot, [
    'merge-base',
    '--is-ancestor',
    revision,
    mainRevision,
  ])

  validateReleaseRevisionEvidence({
    headRevision,
    mainRevision,
    remoteRefs,
    revision,
    tag: expectedTag,
    isMainAncestor,
  })
  console.log(
    `Verified ${tagRef} peels to ${revision} on remote main ${mainRevision}.`,
  )
}

async function runGit(repositoryRoot, args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repositoryRoot,
    env: { ...process.env },
    maxBuffer: 5 * 1024 * 1024,
  })
  return stdout
}

async function gitSucceeds(repositoryRoot, args) {
  try {
    await runGit(repositoryRoot, args)
    return true
  } catch (error) {
    if (error?.code === 1) return false
    throw error
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await verifyReleaseRevision()
}
