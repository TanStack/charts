import { registerStackOptions } from './stack-internal'
import type { ChartKey } from './types'

export type StackOrder =
  'input' | 'ascending' | 'descending' | readonly ChartKey[]
export type StackOffset = 'diverging' | 'normalize' | 'center' | 'wiggle'

export interface StackOptions {
  order?: StackOrder
  offset?: StackOffset
  reverse?: boolean
}

export type StackYChannels<TChannels extends object> = TChannels

export function stackY<const TChannels extends object>(
  channels: TChannels,
): StackYChannels<TChannels>
export function stackY<const TChannels extends object>(
  options: StackOptions,
  channels: TChannels,
): StackYChannels<TChannels>
export function stackY<TChannels extends object>(
  optionsOrChannels: StackOptions | TChannels,
  channels?: TChannels,
): StackYChannels<TChannels> {
  const options = channels ? (optionsOrChannels as StackOptions) : {}
  const resolvedChannels = (channels ?? optionsOrChannels) as TChannels
  const result = { ...resolvedChannels }
  registerStackOptions(result, options)
  return result
}
