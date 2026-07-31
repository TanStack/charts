import { execFileSync } from 'node:child_process'

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

export function tanstackComparisonSourceFailure(source, expectedRevision) {
  if (
    source?.kind !== 'workspace' ||
    !/^[0-9a-f]{40}$/u.test(source.revision)
  ) {
    return 'bundle baseline must record its workspace revision'
  }
  if (source.revision !== expectedRevision) {
    return `bundle baseline workspace revision ${source.revision} does not match measured inputs ${expectedRevision}`
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
