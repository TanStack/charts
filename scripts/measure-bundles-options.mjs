export function readBundleConcurrency(value, fallback) {
  const normalized = value?.trim()
  if (!normalized) return fallback

  const parsed = Number(normalized)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('BUNDLE_BUILD_CONCURRENCY must be a positive integer.')
  }
  return parsed
}
