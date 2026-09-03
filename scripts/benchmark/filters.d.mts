export interface Shard {
  index: number
  total: number
}

export function assertKnownFilterValues(
  filter: ReadonlySet<string> | undefined,
  availableValues: readonly string[],
  label: string,
): void

export function parseShard(value: string | undefined): Shard | undefined

export function selectShard<Value>(
  values: Value[],
  shard: Shard | undefined,
): Value[]

export function selectWeightedShard<Value>(
  values: Value[],
  shard: Shard | undefined,
  weightFor: (value: Value, index: number) => number,
): Value[]
