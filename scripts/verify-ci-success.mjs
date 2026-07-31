import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { releaseRepositorySlug } from './release-security.mjs'

const requestTimeout = 30_000

export function findSuccessfulMainRun(runs, revision) {
  return runs.find(
    (run) =>
      run?.head_sha === revision &&
      run?.head_branch === 'main' &&
      run?.event === 'push' &&
      run?.status === 'completed' &&
      run?.conclusion === 'success',
  )
}

export async function verifyCiSuccess({ env = process.env } = {}) {
  const revision = env.GITHUB_SHA
  const repository = env.GITHUB_REPOSITORY
  assert.match(revision ?? '', /^[0-9a-f]{40}$/, 'CI gate requires a SHA')
  assert.equal(
    repository,
    releaseRepositorySlug,
    `CI gate requires ${releaseRepositorySlug}`,
  )
  assert.ok(env.GITHUB_TOKEN, 'CI gate requires GITHUB_TOKEN')

  const query = new URLSearchParams({
    head_sha: revision,
    per_page: '100',
    status: 'success',
  })
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/chart-library-benchmarks.yml/runs?${query}`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(requestTimeout),
    },
  )
  assert.equal(
    response.ok,
    true,
    `GitHub returned HTTP ${response.status} while checking CI`,
  )
  const payload = await response.json()
  const run = findSuccessfulMainRun(payload.workflow_runs ?? [], revision)
  assert.ok(run, `No successful main CI run exists for ${revision}`)
  console.log(`Verified successful main CI run ${run.id} for ${revision}.`)
  return run
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await verifyCiSuccess()
}
