import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export async function createCatalogSourceModules(conformanceDirectory) {
  const modules = {}

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
          await visit(entryPath)
          return
        }
        if (
          !entry.isFile() ||
          !entry.name.endsWith('.ts') ||
          entry.name.endsWith('.test.ts')
        ) {
          return
        }

        const relativePath = path
          .relative(conformanceDirectory, entryPath)
          .split(path.sep)
          .join('/')
        modules[`./${relativePath}`] = () => readFile(entryPath, 'utf8')
      }),
    )
  }

  await visit(conformanceDirectory)
  return modules
}

export function catalogSourceClosureMetadata(closure, entryPath) {
  const normalizedEntryPath = entryPath.replace(/^\.\//, '')
  const caseDirectory = normalizedEntryPath.slice(
    0,
    normalizedEntryPath.lastIndexOf('/') + 1,
  )
  const sourcePath = (displayPath) =>
    displayPath.startsWith('cases/') || displayPath.startsWith('shared/')
      ? displayPath
      : `${caseDirectory}${displayPath}`
  const pathsByRole = {
    entry: [],
    support: [],
    fixture: [],
    harness: [],
  }

  for (const file of closure.files) {
    pathsByRole[file.kind].push(sourcePath(file.path))
  }
  for (const file of closure.harnessFiles) {
    pathsByRole.harness.push(sourcePath(file.path))
  }

  return {
    totalFiles: closure.totalFiles,
    totalLines: closure.totalLines,
    totalBytes: closure.totalBytes,
    datasetIds: closure.datasets.map(({ id }) => id).sort(compareStrings),
    roles: Object.fromEntries(
      Object.entries(closure.roles).map(([role, metrics]) => [
        role,
        {
          ...metrics,
          paths: pathsByRole[role].sort(compareStrings),
        },
      ]),
    ),
  }
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}
