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

export function selectWeightedShard(values, shard, weightFor) {
  if (!shard) return values
  if (typeof weightFor !== 'function') {
    throw new TypeError('Weighted shard selection requires a weight function.')
  }

  const shardWeights = Array.from({ length: shard.total }, () => 0)
  const assignments = new Array(values.length)
  const weightedValues = values.map((value, index) => {
    const weight = weightFor(value, index)
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(
        `Shard weight at index ${index} must be a finite non-negative number.`,
      )
    }
    return { index, weight }
  })

  weightedValues
    .sort(
      (left, right) => right.weight - left.weight || left.index - right.index,
    )
    .forEach(({ index, weight }) => {
      let selectedShard = 0
      for (let candidate = 1; candidate < shardWeights.length; candidate += 1) {
        if (shardWeights[candidate] < shardWeights[selectedShard]) {
          selectedShard = candidate
        }
      }
      assignments[index] = selectedShard
      shardWeights[selectedShard] += weight
    })

  return values.filter(
    (_value, index) => assignments[index] === shard.index - 1,
  )
}

function pluralize(value, count) {
  return count === 1 ? value : `${value}s`
}
