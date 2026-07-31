import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const { describe, test } = process.env.VITEST
  ? await import('vitest')
  : await import('node:test')

const workflow = await readFile(
  resolve(import.meta.dirname, '../.github/workflows/release.yml'),
  'utf8',
)
const publisher = await readFile(
  resolve(import.meta.dirname, './publish-release.mjs'),
  'utf8',
)
const changesetConfig = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, '../.changeset/config.json'),
    'utf8',
  ),
)
const packageManifest = JSON.parse(
  await readFile(resolve(import.meta.dirname, '../package.json'), 'utf8'),
)

describe('release workflow contract', () => {
  test('versions only the fixed public package set', () => {
    assert.equal(changesetConfig.privatePackages, false)
    assert.deepEqual(changesetConfig.fixed, [
      [
        '@tanstack/charts',
        '@tanstack/react-charts',
        '@tanstack/octane-charts',
        '@tanstack/preact-charts',
        '@tanstack/vue-charts',
        '@tanstack/solid-charts',
        '@tanstack/svelte-charts',
        '@tanstack/angular-charts',
        '@tanstack/lit-charts',
        '@tanstack/alpine-charts',
      ],
    ])
  })

  test('keeps version and publication behind explicit Changesets scripts', () => {
    assert.equal(
      packageManifest.scripts['changeset:version'],
      'changeset version && node scripts/sync-release-changelog.mjs && node scripts/sync-release-version.mjs && pnpm docs:sync && pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile && pnpm format',
    )
    assert.equal(
      packageManifest.scripts['changeset:publish'],
      'node scripts/publish-release.mjs',
    )
  })

  test('uses the standard push-to-main Changesets flow', () => {
    assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/)
    assert.doesNotMatch(workflow, /workflow_run:|workflow_dispatch:|tags:/)
    assert.match(workflow, /group:\s*charts-release-\${{ github\.ref }}/)
    assert.match(workflow, /cancel-in-progress:\s*false/)

    const release = job('release')
    assert.match(release, /github\.repository_owner == 'TanStack'/)
    assert.match(release, /contents:\s*write/)
    assert.match(release, /id-token:\s*write/)
    assert.match(release, /pull-requests:\s*write/)
    assert.doesNotMatch(release, /actions:\s*write/)
    assert.match(release, /fetch-depth:\s*0/)
    assert.match(release, /persist-credentials:\s*true/)
    assert.match(release, /changesets\/action@[0-9a-f]{40}/)
    assert.match(release, /id:\s*changesets/)
    assert.match(release, /branch:\s*main/)
    assert.match(release, /version:\s*pnpm changeset:version/)
    assert.match(release, /publish:\s*pnpm changeset:publish/)
    assert.match(release, /createGithubReleases:\s*false/)
    assert.match(release, /RELEASE_REVISION:\s*\${{ github\.sha }}/)
    assert.doesNotMatch(release, /NPM_TOKEN|NODE_AUTH_TOKEN/)
    assert.equal((workflow.match(/id-token:\s*write/g) ?? []).length, 1)
  })

  test('builds checked tarballs only when npm has a release to publish', () => {
    assert.match(publisher, /validatePublishEnvironment\(process\.env\)/)
    assert.match(publisher, /GITHUB_REF_TYPE, 'branch'/)
    assert.match(publisher, /GITHUB_REF_NAME, 'main'/)
    assert.match(publisher, /'refs\/heads\/main'/)
    assert.match(publisher, /'TanStack\/charts'/)
    assert.match(publisher, /const status = await releaseStatus/)
    assert.ok(
      publisher.lastIndexOf("status.reason === 'finalize'") >
        publisher.indexOf('validateRegistryPackage(artifact, registry)'),
      'recovery must verify registry contents before finalization',
    )
    assert.match(publisher, /await buildReleaseArtifacts\(\)/)
    assert.match(publisher, /await validateReleaseArtifacts\(repositoryRoot\)/)
    assert.ok(
      publisher.indexOf('await publishArtifact(coreArtifact)') <
        publisher.indexOf('await runWithConcurrency('),
      'core must publish before adapters',
    )
    assert.match(publisher, /New tag: \${artifact\.name}@\${version}/)
    assert.match(publisher, /validateTrustedPublishingNpmVersion/)
    assert.match(
      publisher,
      /Verified \${manifest\.tag} registry integrity and attestations before finalization/,
    )
  })

  test('finalizes one recoverable aggregate tag and GitHub release', () => {
    const release = job('release')
    assert.match(
      release,
      /if:\s*steps\.changesets\.outputs\.hasChangesets == 'false'/,
    )
    assert.match(release, /node scripts\/release-status\.mjs/)
    assert.match(release, /if:\s*steps\.status\.outputs\.create_tag == 'true'/)
    assert.match(release, /git tag -a "\$RELEASE_TAG" "\$RELEASE_REVISION"/)
    assert.match(release, /git push origin "refs\/tags\/\$RELEASE_TAG"/)
    assert.match(release, /if:\s*steps\.status\.outputs\.dispatch == 'true'/)
    assert.match(release, /node scripts\/write-release-notes\.mjs/)
    assert.match(release, /gh release create "\$RELEASE_TAG"/)
    assert.match(release, /--verify-tag/)
  })

  test('pins every external action to an immutable revision', () => {
    assertPinnedExternalActions(workflow)
  })
})

function job(name) {
  const lines = workflow.split(/\r?\n/)
  const jobsIndex = lines.findIndex((line) => /^\s*jobs:\s*$/.test(line))
  assert.notEqual(jobsIndex, -1, 'workflow must define jobs')
  const jobsIndent = indentation(lines[jobsIndex])
  const start = lines.findIndex(
    (line, index) =>
      index > jobsIndex &&
      indentation(line) > jobsIndent &&
      new RegExp(`^\\s*${escapeRegExp(name)}:\\s*$`).test(line),
  )
  assert.notEqual(start, -1, `workflow must define job ${name}`)
  const jobIndent = indentation(lines[start])
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) {
      continue
    }
    const indent = indentation(lines[index])
    if (indent < jobIndent) {
      end = index
      break
    }
    if (indent === jobIndent && /^\s*[A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

function assertPinnedExternalActions(source) {
  const uses = [...source.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)].map(
    (match) => match[1],
  )
  assert.ok(uses.length > 0, 'workflow must use actions')
  for (const action of uses) {
    if (action.startsWith('./')) continue
    assert.match(
      action,
      /@[0-9a-f]{40}$/,
      `${action} must be pinned to an immutable commit`,
    )
  }
}

function indentation(line) {
  return line.match(/^\s*/)[0].length
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
