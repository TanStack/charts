export function assertKnownFilterValues(filter, availableValues, label) {
  if (!filter) return
  const available = new Set(availableValues)
  const unknown = [...filter].filter((value) => !available.has(value)).sort()
  if (!unknown.length) return

  throw new Error(
    `Unknown ${label} filter ${pluralize('value', unknown.length)}: ${unknown.join(', ')}. Available: ${[...available].sort().join(', ')}.`,
  )
}

function pluralize(value, count) {
  return count === 1 ? value : `${value}s`
}
