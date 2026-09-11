import { selectWeightedShard } from './benchmark/filters.mjs'

export function conformanceCaseHeight(entry) {
  const height = entry.height === undefined ? 360 : entry.height
  if (!Number.isFinite(height) || height <= 0) {
    throw new TypeError(`Invalid conformance height for ${entry.id ?? 'case'}`)
  }
  return height
}

export function selectCatalogCases(cases, caseFilter, shard, weightFor) {
  const filteredCases = cases.filter(
    (entry) => !caseFilter || caseFilter.has(entry.id),
  )
  if (!filteredCases.length) {
    throw new Error('The case filter did not match a conformance case.')
  }

  const selectedCases = selectWeightedShard(filteredCases, shard, weightFor)
  if (!selectedCases.length) {
    throw new Error(
      `Conformance shard ${shard.index}/${shard.total} did not select a case.`,
    )
  }
  return selectedCases
}

export function normalizeTypeDiagnosticPath(sourcePath) {
  return sourcePath.replaceAll('\\', '/')
}
