import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  catalogBasePath,
  catalogOrigin,
  stageConformanceDeployment,
} from './stage-conformance-deployment.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  )
})

describe('catalog deployment staging', () => {
  it('mirrors the production URL below the Worker asset root', async () => {
    const fixture = await createFixture()
    const result = await stageConformanceDeployment(fixture)

    await expect(
      fs.readFile(
        path.join(result.stageDirectory, 'charts', 'catalog', 'index.html'),
        'utf8',
      ),
    ).resolves.toBe('catalog')
    await expect(
      fs.readFile(path.join(result.stageDirectory, '_headers'), 'utf8'),
    ).resolves.toBe('headers')
    expect(result.caseCount).toBe(1)
    expect(result.fileCount).toBe(4)
  })

  it('rejects a build for another public base path', async () => {
    const fixture = await createFixture({ basePath: '/' })

    await expect(stageConformanceDeployment(fixture)).rejects.toThrow(
      `catalog base path must be ${catalogBasePath}`,
    )
  })

  it('refuses to replace another repository directory', async () => {
    const fixture = await createFixture()
    fixture.stageDirectory = path.join(process.cwd(), 'packages')

    await expect(stageConformanceDeployment(fixture)).rejects.toThrow(
      'catalog staging is limited to .catalog-deploy or a temporary directory',
    )
  })
})

async function createFixture({ basePath = catalogBasePath } = {}) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'tanstack-charts-catalog-'),
  )
  temporaryDirectories.push(directory)
  const sourceDirectory = path.join(directory, 'source')
  const stageDirectory = path.join(directory, 'stage')
  const headersPath = path.join(directory, '_headers')
  await fs.mkdir(sourceDirectory, { recursive: true })
  await fs.writeFile(path.join(sourceDirectory, 'index.html'), 'catalog')
  await fs.writeFile(path.join(sourceDirectory, '404.html'), 'missing')
  await fs.writeFile(
    path.join(sourceDirectory, 'catalog.json'),
    JSON.stringify({
      site: {
        basePath,
        origin: catalogOrigin,
      },
      cases: [{ id: '01-line' }],
    }),
  )
  await fs.writeFile(headersPath, 'headers')
  return { headersPath, sourceDirectory, stageDirectory }
}
