import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

export const catalogBasePath = '/charts/catalog/'
export const catalogOrigin = 'https://tanstack.com'
export const workerAssetFileLimit = 20_000
export const workerAssetSizeLimit = 25 * 1024 * 1024

const defaultSourceDirectory = path.join(
  rootDirectory,
  'examples',
  'conformance',
  'dist',
)
const defaultStageDirectory = path.join(rootDirectory, '.catalog-deploy')
const defaultHeadersPath = path.join(
  rootDirectory,
  'deploy',
  'catalog',
  '_headers',
)

export async function stageConformanceDeployment({
  sourceDirectory = defaultSourceDirectory,
  stageDirectory = defaultStageDirectory,
  headersPath = defaultHeadersPath,
} = {}) {
  const resolvedSource = path.resolve(sourceDirectory)
  const resolvedStage = path.resolve(stageDirectory)
  assertSafeStageDirectory(resolvedStage)

  const catalog = JSON.parse(
    await fs.readFile(path.join(resolvedSource, 'catalog.json'), 'utf8'),
  )
  assert(
    catalog.site?.origin === catalogOrigin,
    `catalog origin must be ${catalogOrigin}`,
  )
  assert(
    catalog.site?.basePath === catalogBasePath,
    `catalog base path must be ${catalogBasePath}`,
  )
  assert(
    Array.isArray(catalog.cases) && catalog.cases.length > 0,
    'catalog must contain at least one case',
  )

  const sourceSummary = await inspectAssetTree(resolvedSource)
  assertWorkerAssetLimits(sourceSummary, 1)

  await fs.rm(resolvedStage, { recursive: true, force: true })
  const publicDirectory = path.join(
    resolvedStage,
    ...catalogBasePath.split('/').filter(Boolean),
  )
  await fs.mkdir(path.dirname(publicDirectory), { recursive: true })
  await fs.cp(resolvedSource, publicDirectory, {
    recursive: true,
    errorOnExist: true,
  })
  await fs.copyFile(headersPath, path.join(resolvedStage, '_headers'))

  const stagedSummary = await inspectAssetTree(resolvedStage)
  assertWorkerAssetLimits(stagedSummary)

  return {
    caseCount: catalog.cases.length,
    fileCount: stagedSummary.fileCount,
    largestFileBytes: stagedSummary.largestFileBytes,
    totalBytes: stagedSummary.totalBytes,
    publicDirectory,
    stageDirectory: resolvedStage,
  }
}

async function inspectAssetTree(directory) {
  let fileCount = 0
  let largestFileBytes = 0
  let totalBytes = 0

  async function visit(currentDirectory) {
    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true,
    })

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error(
          `catalog deployment cannot contain symlinks: ${entryPath}`,
        )
      }
      if (entry.isDirectory()) {
        await visit(entryPath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`catalog deployment contains a non-file: ${entryPath}`)
      }

      const stats = await fs.stat(entryPath)
      fileCount += 1
      largestFileBytes = Math.max(largestFileBytes, stats.size)
      totalBytes += stats.size
    }
  }

  await visit(directory)
  return { fileCount, largestFileBytes, totalBytes }
}

function assertWorkerAssetLimits(summary, additionalFiles = 0) {
  assert(
    summary.fileCount + additionalFiles <= workerAssetFileLimit,
    `catalog has ${summary.fileCount + additionalFiles} assets; Workers allows ${workerAssetFileLimit}`,
  )
  assert(
    summary.largestFileBytes <= workerAssetSizeLimit,
    `catalog has a ${summary.largestFileBytes}-byte asset; Workers allows ${workerAssetSizeLimit}`,
  )
}

function assertSafeStageDirectory(directory) {
  const root = path.parse(directory).root
  assert(directory !== root, 'refusing to stage at a filesystem root')
  assert(directory !== rootDirectory, 'refusing to replace the repository root')
  assert(
    directory === defaultStageDirectory ||
      isDescendantDirectory(path.resolve(os.tmpdir()), directory),
    'catalog staging is limited to .catalog-deploy or a temporary directory',
  )
}

function isDescendantDirectory(parent, directory) {
  const relative = path.relative(parent, directory)
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  const summary = await stageConformanceDeployment()
  console.log(
    `Staged ${summary.caseCount} catalog cases in ${summary.fileCount} files (${formatBytes(summary.totalBytes)}; largest ${formatBytes(summary.largestFileBytes)}).`,
  )
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}
