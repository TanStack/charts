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

describe('release workflow contract', () => {
  test('orchestrates versions and tags only from successful main CI', () => {
    assert.match(
      workflow,
      /workflow_run:[\s\S]*workflows:[\s\S]*Chart library benchmarks[\s\S]*types:[\s\S]*completed/,
    )
    assert.match(workflow, /push:[\s\S]*tags:[\s\S]*['"]v\*['"]/)
    assert.match(workflow, /workflow_dispatch:/)
    assert.match(workflow, /group:\s*charts-release\s*$/m)
    assert.match(workflow, /cancel-in-progress:\s*false/)

    const version = job('version')
    assert.match(version, /github\.event_name == 'workflow_run'/)
    assert.match(
      version,
      /github\.event\.workflow_run\.conclusion == 'success'/,
    )
    assert.match(version, /github\.event\.workflow_run\.event == 'push'/)
    assert.match(version, /github\.event\.workflow_run\.head_branch == 'main'/)
    assert.match(
      version,
      /ref:\s*\${{ github\.event\.workflow_run\.head_sha }}/,
    )
    assert.match(version, /persist-credentials:\s*true/)
    assert.match(version, /changesets\/action@[0-9a-f]{40}/)
    assert.match(version, /version:\s*pnpm changeset:version/)
    assert.match(version, /createGithubReleases:\s*false/)
    assert.match(version, /contents:\s*write/)
    assert.match(version, /pull-requests:\s*write/)
    assert.doesNotMatch(version, /id-token:\s*write/)
    assert.doesNotMatch(version, /actions:\s*write/)
  })

  test('creates an annotated tag and explicitly dispatches its release', () => {
    const tag = job('tag')
    assert.deepEqual(needs(tag), ['version'])
    assert.match(tag, /github\.event\.workflow_run\.conclusion == 'success'/)
    assert.match(tag, /github\.event\.workflow_run\.head_branch == 'main'/)
    assert.match(tag, /ref:\s*\${{ github\.event\.workflow_run\.head_sha }}/)
    assert.match(tag, /node scripts\/release-status\.mjs/)
    assert.ok(
      tag.indexOf('release-status.mjs') < tag.indexOf('git tag -a'),
      'release notes and registry state must be valid before a tag is created',
    )
    assert.match(
      tag,
      /RELEASE_REVISION:\s*\${{ github\.event\.workflow_run\.head_sha }}/,
    )
    assert.match(tag, /git tag -a "\$RELEASE_TAG" "\$RELEASE_REVISION"/)
    assert.match(tag, /git push origin "refs\/tags\/\$RELEASE_TAG"/)
    assert.match(tag, /gh workflow run release\.yml --ref "\$RELEASE_TAG"/)
    assert.ok(
      tag.indexOf('git tag -a') < tag.indexOf('gh workflow run release.yml'),
      'the annotated tag must exist before its tag-scoped release is dispatched',
    )
    assert.match(tag, /actions:\s*write/)
    assert.match(tag, /contents:\s*write/)
    assert.doesNotMatch(tag, /id-token:\s*write/)
    assert.doesNotMatch(tag, /pull-requests:\s*write/)
  })

  test('builds fresh artifacts only after tag and exact-SHA CI verification', () => {
    const validate = job('validate')
    assert.match(
      validate,
      /if:\s*github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/,
    )
    assert.match(validate, /ref:\s*\${{ github\.sha }}/)
    assert.match(validate, /persist-credentials:\s*false/)
    assert.match(validate, /actions:\s*read/)
    assert.match(validate, /contents:\s*read/)
    assert.doesNotMatch(validate, /(?:actions|contents):\s*write/)
    assert.doesNotMatch(validate, /id-token:\s*write/)
    assert.match(validate, /node scripts\/verify-release-revision\.mjs/)
    assert.match(validate, /node scripts\/verify-ci-success\.mjs/)
    assert.match(validate, /node scripts\/build-release-artifacts\.mjs/)
    assert.match(validate, /node scripts\/publish-release\.mjs --check/)
    assert.match(validate, /actions\/upload-artifact@[0-9a-f]{40}/)
    assert.match(validate, /name:\s*charts-release-\${{ github\.ref_name }}/)
    assert.match(validate, /path:\s*\.release-artifacts/)
    assert.doesNotMatch(validate, /actions\/download-artifact@/)
    assert.ok(
      validate.indexOf('verify-ci-success.mjs') <
        validate.indexOf('build-release-artifacts.mjs'),
      'the exact revision must be CI-approved before package artifacts are built',
    )
  })

  test('isolates npm OIDC to artifact-only publication', () => {
    const publish = job('publish')
    assert.equal((workflow.match(/id-token:\s*write/g) ?? []).length, 1)
    assert.match(publish, /id-token:\s*write/)
    assert.match(publish, /contents:\s*read/)
    assert.doesNotMatch(publish, /(?:actions|contents):\s*write/)
    assert.deepEqual(needs(publish), ['validate'])
    assert.match(publish, /if:\s*needs\.validate\.result == 'success'/)
    assert.match(publish, /ref:\s*\${{ github\.sha }}/)
    assert.match(publish, /persist-credentials:\s*false/)
    assert.match(publish, /actions\/download-artifact@[0-9a-f]{40}/)
    assert.match(publish, /name:\s*charts-release-\${{ github\.ref_name }}/)
    assert.match(publish, /path:\s*\.release-artifacts/)
    assert.match(publish, /node scripts\/verify-release-revision\.mjs/)
    assert.match(publish, /node scripts\/publish-release\.mjs/)
    assert.doesNotMatch(publish, /\.\/\.github\/actions\/setup/)
    assert.doesNotMatch(publish, /\b(?:npm|pnpm) install\b/)
    assert.doesNotMatch(publish, /\bcorepack enable\b/)
    assert.doesNotMatch(publish, /\bpnpm (?:test|typecheck|docs:check)\b/)
    assert.doesNotMatch(publish, /\bNPM_TOKEN\b|\bNODE_AUTH_TOKEN\b/)
    assert.ok(
      publish.indexOf('verify-release-revision.mjs') <
        publish.indexOf('publish-release.mjs'),
      'publication must revalidate the tag before invoking npm',
    )
  })

  test('gates the GitHub release on independent registry verification', () => {
    const verify = job('verify')
    assert.deepEqual(needs(verify), ['publish'])
    assert.match(verify, /ref:\s*\${{ github\.sha }}/)
    assert.match(verify, /persist-credentials:\s*false/)
    assert.match(verify, /actions\/download-artifact@[0-9a-f]{40}/)
    assert.match(verify, /node scripts\/verify-published-release\.mjs/)
    assert.doesNotMatch(verify, /id-token:\s*write/)
    assert.doesNotMatch(verify, /contents:\s*write/)

    const release = job('release')
    assert.deepEqual(needs(release), ['verify'])
    assert.match(release, /ref:\s*\${{ github\.sha }}/)
    assert.match(release, /persist-credentials:\s*false/)
    assert.match(release, /node scripts\/verify-release-revision\.mjs/)
    assert.match(release, /node scripts\/write-release-notes\.mjs/)
    assert.match(release, /gh release create "\$GITHUB_REF_NAME"/)
    assert.match(release, /--verify-tag/)
    assert.match(release, /--notes-file \/tmp\/charts-release-notes\.md/)
    assert.doesNotMatch(release, /--notes-file CHANGELOG\.md/)
    assert.doesNotMatch(release, /id-token:\s*write/)
    assert.ok(
      release.indexOf('verify-release-revision.mjs') <
        release.indexOf('gh release create'),
      'the GitHub release must use freshly validated refs',
    )
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

function needs(block) {
  const scalar = block.match(/^\s*needs:\s*([A-Za-z0-9_-]+)\s*$/m)
  if (scalar) return [scalar[1]]
  return scalarList(block, 'needs')
}

function scalarList(block, key) {
  const lines = block.split(/\r?\n/)
  const start = lines.findIndex((line) =>
    new RegExp(`^\\s*${escapeRegExp(key)}:\\s*$`).test(line),
  )
  assert.notEqual(start, -1, `expected ${key} list`)
  const keyIndent = indentation(lines[start])
  const values = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) {
      continue
    }
    if (indentation(lines[index]) <= keyIndent) break
    const item = lines[index].match(/^\s*-\s*([^#]+?)\s*$/)
    if (item) values.push(item[1].replace(/^['"]|['"]$/g, ''))
  }
  return values
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
