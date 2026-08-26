import type { ChartPositionChannel, MaterializedChannel } from './types'

const positionChannel = Symbol()

type PositionedMaterializedChannel = MaterializedChannel & {
  readonly [positionChannel]?: ChartPositionChannel
}

/** Reads positional identity without coupling it to one channel record key. */
export function readMaterializedPositionChannel(
  name: string,
  channel: MaterializedChannel,
): ChartPositionChannel | undefined {
  if (name === 'x' || name === 'y') return name
  return (channel as PositionedMaterializedChannel)[positionChannel]
}

/** Retains positional identity when a composed mark namespaces channel keys. */
export function preserveMaterializedPositionChannel(
  name: string,
  channel: MaterializedChannel,
): MaterializedChannel {
  const position = readMaterializedPositionChannel(name, channel)
  if (position === undefined) return channel
  if (
    (channel as PositionedMaterializedChannel)[positionChannel] === position
  ) {
    return channel
  }
  const positioned: PositionedMaterializedChannel = {
    ...channel,
    [positionChannel]: position,
  }
  return positioned
}
