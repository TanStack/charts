export function bundleBaselineShapeFailures(
  baseline,
  { libraryIds, chartTypes, tiers },
) {
  const failures = []

  if (
    JSON.stringify(baseline.matrix?.chartTypes) !==
      JSON.stringify(chartTypes) ||
    JSON.stringify(baseline.matrix?.tiers) !== JSON.stringify(tiers)
  ) {
    failures.push(
      'bundle baseline matrix does not match the configured chart types and tiers',
    )
  }

  const expectedBundleIds = libraryIds.flatMap((libraryId) =>
    chartTypes.flatMap((chartType) =>
      tiers.map((tier) => `${libraryId}-${chartType}-${tier}`),
    ),
  )
  pushKeySetFailure(
    failures,
    'bundle baseline cases',
    recordKeys(baseline.bundles),
    expectedBundleIds,
  )
  pushKeySetFailure(
    failures,
    'bundle baseline package versions',
    recordKeys(baseline.packageVersions),
    libraryIds,
  )
  pushKeySetFailure(
    failures,
    'bundle baseline sources',
    recordKeys(baseline.sources),
    libraryIds,
  )

  return failures
}

export function bundleBaselineBundles(baseline) {
  return recordOrEmpty(baseline?.bundles)
}

function pushKeySetFailure(failures, label, actualValues, expectedValues) {
  const actual = new Set(actualValues)
  const expected = new Set(expectedValues)
  const missing = [...expected].filter((value) => !actual.has(value)).sort()
  const extra = [...actual].filter((value) => !expected.has(value)).sort()
  if (!missing.length && !extra.length) return

  failures.push(
    `${label} do not match the configured libraries and matrix; missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}`,
  )
}

function recordKeys(value) {
  return Object.keys(recordOrEmpty(value))
}

function recordOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}
