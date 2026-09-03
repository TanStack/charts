import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

export const tanstackComparisonInputPaths = [
  'benchmarks/comparison/libraries/tanstack',
  'packages/charts-core/src',
  'benchmarks/comparison/libraries/tier.ts',
  'benchmarks/comparison/stress/operation.ts',
  'benchmarks/comparison/types.ts',
]

export function tanstackComparisonRevision(repositoryRoot) {
  const revision = execFileSync(
    'git',
    ['log', '-1', '--format=%H', '--', ...tanstackComparisonInputPaths],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  ).trim()

  if (!/^[0-9a-f]{40}$/u.test(revision)) {
    throw new Error(
      'Unable to resolve the TanStack comparison input revision from Git history',
    )
  }
  return revision
}

export function tanstackComparisonInputDigest(
  repositoryRoot,
  inputPaths = tanstackComparisonInputPaths,
) {
  const hash = createHash('sha256')
  const files = inputPaths
    .flatMap((path) => collectFiles(resolve(repositoryRoot, path)))
    .sort()

  for (const file of files) {
    const path = relative(repositoryRoot, file).split(sep).join('/')
    const contents = readFileSync(file)
    hash.update(path)
    hash.update('\0')
    hash.update(String(contents.byteLength))
    hash.update('\0')
    hash.update(contents)
    hash.update('\0')
  }

  return `sha256:${hash.digest('hex')}`
}

export function tanstackComparisonSourceFailure(
  source,
  expectedRevision,
  expectedInputDigest,
) {
  if (
    source?.kind !== 'workspace' ||
    !/^[0-9a-f]{40}$/u.test(source.revision)
  ) {
    return 'bundle baseline must record its workspace revision'
  }
  if (!/^sha256:[0-9a-f]{64}$/u.test(source.inputDigest)) {
    return 'bundle baseline must record its workspace input digest'
  }
  if (source.inputDigest !== expectedInputDigest) {
    return `bundle baseline workspace input digest ${source.inputDigest} does not match measured inputs ${expectedInputDigest} at ${expectedRevision}`
  }
}

export function comparisonInstalledVersionFailure(
  source,
  actualVersion,
  baselineVersion,
) {
  if (
    source?.kind === 'workspace' ||
    !actualVersion ||
    actualVersion === baselineVersion
  ) {
    return
  }

  return `installed version ${actualVersion} does not match baseline ${baselineVersion}`
}

function collectFiles(path) {
  const stats = lstatSync(path)
  if (stats.isSymbolicLink()) {
    throw new Error(`Comparison input must not be a symbolic link: ${path}`)
  }
  if (stats.isFile()) return [path]
  if (!stats.isDirectory()) {
    throw new Error(`Comparison input must be a file or directory: ${path}`)
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    collectFiles(resolve(path, entry.name)),
  )
}
