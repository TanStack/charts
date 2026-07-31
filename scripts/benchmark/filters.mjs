export function assertKnownFilterValues(filter, availableValues, label) {
  if (!filter) return
  const available = new Set(availableValues)
  const unknown = [...filter].filter((value) => !available.has(value)).sort()
  if (!unknown.length) return

  throw new Error(
    `Unknown ${label} filter ${pluralize('value', unknown.length)}: ${unknown.join(', ')}. Available: ${[...available].sort().join(', ')}.`,
  )
}

export function parseShard(value) {
  if (value === undefined) return undefined
  const match = /^(\d+)\/(\d+)$/.exec(value)
  if (!match) {
    throw new Error(`Invalid shard "${value}". Expected <index>/<total>.`)
  }
  const index = Number(match[1])
  const total = Number(match[2])
  if (index < 1 || total < 1 || index > total) {
    throw new Error(
      `Invalid shard "${value}". Index must be between 1 and ${total}.`,
    )
  }
  return { index, total }
}

export function selectShard(values, shard) {
  if (!shard) return values
  return values.filter(
    (_value, index) => index % shard.total === shard.index - 1,
  )
}

function pluralize(value, count) {
  return count === 1 ? value : `${value}s`
}
