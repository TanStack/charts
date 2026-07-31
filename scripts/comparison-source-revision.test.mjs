import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  comparisonInstalledVersionFailure,
  tanstackComparisonInputPaths,
  tanstackComparisonRevision,
  tanstackComparisonSourceFailure,
} from './comparison-source-revision.mjs'

const temporaryRepositories = []

afterEach(async () => {
  await Promise.all(
    temporaryRepositories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('TanStack comparison source provenance', () => {
  it('uses the last commit that changed a measured input', async () => {
    const repository = await mkdtemp(
      resolve(tmpdir(), 'charts-comparison-revision-'),
    )
    temporaryRepositories.push(repository)
    runGit(repository, 'init')

    const coreInput = resolve(
      repository,
      tanstackComparisonInputPaths[1],
      'index.ts',
    )
    await mkdir(dirname(coreInput), { recursive: true })
    await writeFile(coreInput, 'export const value = 1\n')
    commitAll(repository, 'Add measured source')
    const measuredRevision = runGit(repository, 'rev-parse', 'HEAD')

    await writeFile(resolve(repository, 'README.md'), '# Documentation\n')
    commitAll(repository, 'Update documentation')

    expect(tanstackComparisonRevision(repository)).toBe(measuredRevision)
  })

  it('rejects a well-formed revision from different inputs', () => {
    const expectedRevision = 'a'.repeat(40)
    const recordedRevision = 'b'.repeat(40)

    expect(
      tanstackComparisonSourceFailure(
        { kind: 'workspace', revision: recordedRevision },
        expectedRevision,
      ),
    ).toBe(
      `bundle baseline workspace revision ${recordedRevision} does not match measured inputs ${expectedRevision}`,
    )
  })

  it('uses source revisions for workspaces and versions for installed packages', () => {
    expect(
      comparisonInstalledVersionFailure(
        { kind: 'workspace', revision: 'a'.repeat(40) },
        '0.0.2',
        '0.0.1',
      ),
    ).toBeUndefined()
    expect(
      comparisonInstalledVersionFailure(
        { kind: 'package', packageName: 'chart.js', version: '4.5.1' },
        '4.5.2',
        '4.5.1',
      ),
    ).toBe('installed version 4.5.2 does not match baseline 4.5.1')
  })
})

function commitAll(repository, message) {
  runGit(repository, 'add', '.')
  runGit(
    repository,
    '-c',
    'user.name=TanStack Charts Test',
    '-c',
    'user.email=charts-test@example.com',
    'commit',
    '-m',
    message,
  )
}

function runGit(repository, ...args) {
  return execFileSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}
