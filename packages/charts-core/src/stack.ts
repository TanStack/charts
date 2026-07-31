import type { ChartKey } from './types'

export type StackOrder =
  'input' | 'ascending' | 'descending' | readonly ChartKey[]
export type StackOffset = 'diverging' | 'normalize' | 'center' | 'wiggle'

export interface StackOptions {
  order?: StackOrder
  offset?: StackOffset
  reverse?: boolean
}

export interface StackLayout extends StackOptions {
  readonly type: 'stack'
}

export function stack(options: StackOptions = {}): StackLayout {
  return { type: 'stack', ...options }
}
