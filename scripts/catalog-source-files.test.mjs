import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  catalogSourceClosureMetadata,
  createCatalogSourceModules,
} from './catalog-source-files.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('catalog source files', () => {
  it('loads TypeScript source files without tests', async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'charts-catalog-source-'),
    )
    temporaryDirectories.push(directory)
    await mkdir(path.join(directory, 'cases', 'example'), { recursive: true })
    await Promise.all([
      writeFile(
        path.join(directory, 'cases', 'example', 'tanstack.ts'),
        'export const chart = true\n',
      ),
      writeFile(
        path.join(directory, 'cases', 'example', 'tanstack.test.ts'),
        'throw new Error("not source")\n',
      ),
      writeFile(
        path.join(directory, 'cases', 'example', 'view.tsx'),
        'export const chart = <svg />\n',
      ),
      writeFile(
        path.join(directory, 'cases', 'example', 'view.test.tsx'),
        'throw new Error("not source")\n',
      ),
      writeFile(path.join(directory, 'cases', 'example', 'case.json'), '{}\n'),
    ])

    const modules = await createCatalogSourceModules(directory)

    expect(Object.keys(modules).sort()).toEqual([
      './cases/example/tanstack.ts',
      './cases/example/view.tsx',
    ])
    await expect(modules['./cases/example/tanstack.ts']()).resolves.toBe(
      'export const chart = true\n',
    )
    await expect(modules['./cases/example/view.tsx']()).resolves.toBe(
      'export const chart = <svg />\n',
    )
  })

  it('serializes metrics and paths without source text', () => {
    const metadata = catalogSourceClosureMetadata(
      {
        files: [
          {
            path: 'tanstack.ts',
            source: 'private source',
            kind: 'entry',
            lines: 1,
            bytes: 14,
          },
        ],
        totalFiles: 1,
        totalLines: 1,
        totalBytes: 14,
        datasets: [],
        roles: {
          entry: { files: 1, lines: 1, bytes: 14 },
          support: { files: 0, lines: 0, bytes: 0 },
          fixture: { files: 0, lines: 0, bytes: 0 },
          harness: { files: 1, lines: 2, bytes: 20 },
        },
        harnessFiles: [{ path: 'shared/mount.ts', lines: 2, bytes: 20 }],
        excludedHarnessPaths: ['shared/mount.ts'],
      },
      './cases/example/tanstack.ts',
    )

    expect(metadata).toEqual({
      totalFiles: 1,
      totalLines: 1,
      totalBytes: 14,
      datasetIds: [],
      roles: {
        entry: {
          files: 1,
          lines: 1,
          bytes: 14,
          paths: ['cases/example/tanstack.ts'],
        },
        support: { files: 0, lines: 0, bytes: 0, paths: [] },
        fixture: { files: 0, lines: 0, bytes: 0, paths: [] },
        harness: {
          files: 1,
          lines: 2,
          bytes: 20,
          paths: ['shared/mount.ts'],
        },
      },
    })
    expect(JSON.stringify(metadata)).not.toContain('private source')
  })
})
