import type { ChartScaleInput } from './types'

export interface GroupOptions {
  scale?: ChartScaleInput<any>
  padding?: number
}

export interface GroupLayout {
  readonly type: 'group'
  readonly scale?: ChartScaleInput<any>
  readonly padding?: number
}

export function group(options: GroupOptions = {}): GroupLayout {
  return { type: 'group', ...options }
}
