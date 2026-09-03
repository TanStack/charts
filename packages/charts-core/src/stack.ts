import type { ChartKey } from './types'

export type StackOrder =
  'input' | 'ascending' | 'descending' | 'inside-out' | readonly ChartKey[]
export type StackOffset = 'diverging' | 'normalize' | 'center' | 'wiggle'

export interface StackAnchor {
  /** Series whose interval contains the zero anchor. */
  series: ChartKey
  /** Position within that interval: zero is its start and one is its end. */
  fraction?: number
}

export interface StackOptions {
  order?: StackOrder
  offset?: StackOffset
  reverse?: boolean
  /** Translate each position so a point within one series lands on zero. */
  anchor?: StackAnchor
}

export interface StackLayout extends StackOptions {
  readonly type: 'stack'
}

export function stack(options: StackOptions = {}): StackLayout {
  return { type: 'stack', ...options }
}
