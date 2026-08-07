import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  classifyReleaseStatus,
  readReleaseRevision,
} from './release-status.mjs'

const execFileAsync = promisify(execFile)

describe('automated release status', () => {
  it('waits while changesets still need a version pull request', () => {
    expect(
      classifyReleaseStatus({
        hasPendingChangesets: true,
        packageStates: ['missing'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: false,
      dispatch: false,
      reason: 'pending-changesets',
    })
  })

  it('waits by default when a published version has later changesets', () => {
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: true,
        packageStates: ['published', 'published'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: false,
      dispatch: false,
      reason: 'pending-changesets',
    })
  })

  it('explicitly recovers an already-published version despite later changesets', () => {
    expect(
      classifyReleaseStatus({
        allowPublishedRecovery: true,
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: true,
        packageStates: ['published', 'published'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: true,
      dispatch: true,
      reason: 'finalize',
    })
  })

  it('creates and dispatches a new release tag when packages are missing', () => {
    expect(
      classifyReleaseStatus({
        hasPendingChangesets: false,
        packageStates: ['missing', 'missing'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: true,
      dispatch: true,
      reason: 'publish',
    })
  })

  it('can resume publishing or GitHub release creation idempotently', () => {
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'missing'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: true,
      reason: 'publish',
    })
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'published'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: true,
      reason: 'finalize',
    })
  })

  it('rejects dispatching an existing tag for a different revision', () => {
    expect(() =>
      classifyReleaseStatus({
        expectedRevision: 'b'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['missing'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toThrow('existing release tag points to a different revision')
  })

  it('rejects an existing tag when the expected revision is missing', () => {
    for (const expectedRevision of [undefined, '']) {
      expect(() =>
        classifyReleaseStatus({
          expectedRevision,
          hasPendingChangesets: false,
          packageStates: ['missing'],
          releaseExists: false,
          tagRevision: 'a'.repeat(40),
        }),
      ).toThrow('existing release tag requires the expected revision')
    }
  })

  it('does nothing after npm, the tag, and GitHub release all exist', () => {
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'published'],
        releaseExists: true,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: false,
      reason: 'released',
    })
  })

  it('rejects a GitHub release whose tag points to another revision', () => {
    expect(() =>
      classifyReleaseStatus({
        expectedRevision: 'b'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'published'],
        releaseExists: true,
        tagRevision: 'a'.repeat(40),
      }),
    ).toThrow('existing release tag points to a different revision')
  })

  it('finds the changesets merge that introduced the current version', async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), 'charts-release-status-'),
    )

    try {
      await git(repositoryRoot, 'init', '--initial-branch=main')
      await git(repositoryRoot, 'config', 'user.name', 'Release Status Test')
      await git(
        repositoryRoot,
        'config',
        'user.email',
        'release-status@example.com',
      )
      await git(repositoryRoot, 'config', 'commit.gpgsign', 'false')
      await git(repositoryRoot, 'config', 'merge.gpgsign', 'false')
      await git(repositoryRoot, 'config', 'core.hooksPath', '.git/no-hooks')

      const manifestDirectory = join(repositoryRoot, 'packages', 'charts-core')
      const manifestPath = join(manifestDirectory, 'package.json')
      await mkdir(manifestDirectory, { recursive: true })
      await writeManifest(manifestPath, '0.6.4')
      await git(repositoryRoot, 'add', 'packages/charts-core/package.json')
      await git(repositoryRoot, 'commit', '-m', 'chore: initial version')

      await git(repositoryRoot, 'switch', '-c', 'changeset-release/main')
      await writeManifest(manifestPath, '0.6.5')
      await git(repositoryRoot, 'add', 'packages/charts-core/package.json')
      await git(repositoryRoot, 'commit', '-m', 'chore: version packages')

      await git(repositoryRoot, 'switch', 'main')
      await git(
        repositoryRoot,
        'merge',
        '--no-ff',
        'changeset-release/main',
        '-m',
        'Merge pull request #1 from TanStack/changeset-release/main',
      )

      const { stdout } = await git(repositoryRoot, 'rev-parse', 'HEAD')
      const expectedRevision = stdout.trim()
      const revision = await readReleaseRevision(repositoryRoot, '0.6.5')

      expect(revision).toMatch(/^[0-9a-f]{40}$/)
      expect(revision).toBe(expectedRevision)
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true })
    }
  })
})

function git(repositoryRoot, ...args) {
  return execFileAsync('git', args, { cwd: repositoryRoot })
}

async function writeManifest(manifestPath, version) {
  await writeFile(
    manifestPath,
    `${JSON.stringify({ name: '@tanstack/charts', version }, null, 2)}\n`,
  )
}
