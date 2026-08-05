import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const dependencyFiles = new Set([
  '.nvmrc',
  'nx.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'project.json',
  'tsconfig.json',
])

const workflowFiles = new Set([
  '.github/actions/setup/action.yml',
  '.github/workflows/chart-library-benchmarks.yml',
  'scripts/ci-workflow.test.mjs',
  'scripts/classify-ci-changes.mjs',
])

const sharedBenchmarkFiles = new Set([
  'benchmarks/comparison/types.ts',
  'benchmarks/comparison/stress/operation.ts',
  'scripts/benchmark/browser.mjs',
  'scripts/benchmark/chart-libraries.mjs',
  'scripts/run-with-concurrency.mjs',
])

const comparisonFiles = new Set([
  'scripts/benchmark/bundle-baseline.mjs',
  'scripts/benchmark/comparison-capabilities.mjs',
  'scripts/compare-chart-libraries.mjs',
  'scripts/comparison-source-revision.mjs',
])

const stressFiles = new Set([
  'scripts/benchmark/filters.mjs',
  'scripts/benchmark/page-errors.mjs',
  'scripts/benchmark/result-validity.mjs',
  'scripts/benchmark/retry.mjs',
  'scripts/benchmark/stress-artifacts.mjs',
  'scripts/stress-chart-libraries.mjs',
])

export function classifyCiChanges(paths) {
  const normalizedPaths = paths
    .map((path) => path.replaceAll('\\', '/'))
    .filter(Boolean)
  const result = {
    static: normalizedPaths.length > 0 ? 'docs' : 'full',
    compare: false,
    stress: false,
  }

  for (const path of normalizedPaths) {
    if (!isDocumentationPath(path)) result.static = 'full'
    if (isDocumentationPath(path)) continue

    if (
      dependencyFiles.has(path) ||
      workflowFiles.has(path) ||
      sharedBenchmarkFiles.has(path) ||
      path.startsWith('packages/') ||
      path.startsWith('benchmarks/comparison/libraries/')
    ) {
      result.compare = true
      result.stress = true
      continue
    }

    if (
      comparisonFiles.has(path) ||
      path === 'benchmarks/comparison/bundle-baseline.json'
    ) {
      result.compare = true
    }

    if (
      stressFiles.has(path) ||
      (path.startsWith('benchmarks/comparison/stress/') &&
        !path.endsWith('.md'))
    ) {
      result.stress = true
    }
  }

  return result
}

function isDocumentationPath(path) {
  return (
    path.startsWith('docs/') ||
    path.startsWith('media/') ||
    path === 'llms.txt' ||
    path.endsWith('.md') ||
    /^packages\/[^/]+\/llms\.txt$/u.test(path) ||
    /^packages\/[^/]+\/docs\//u.test(path)
  )
}

function renderGithubOutputs(result) {
  return Object.entries(result)
    .map(([name, value]) => `${name}=${value}`)
    .join('\n')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const input = readFileSync(0, 'utf8')
  const separator = input.includes('\0') ? '\0' : /\r?\n/u
  const result = classifyCiChanges(input.split(separator))
  process.stdout.write(`${renderGithubOutputs(result)}\n`)
}
