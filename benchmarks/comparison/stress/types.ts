import type { BenchmarkInput } from '../types'

export type StressWorkloadId =
  | 'raw-line'
  | 'raw-scatter'
  | 'interactive-scatter'
  | 'binned-density'
  | 'pixel-envelope'
  | 'viewport-envelope'
  | 'stats-multi-series-line'
  | 'rolling-keyed-window'
  | 'histogram-128'
  | 'top-categories'
  | 'dashboard-lines'

export type StressUpdateKind =
  | 'noop'
  | 'same'
  | 'append'
  | 'replace'
  | 'reorder'
  | 'resize'
  | 'viewport'
  | 'toggle-series'
  | 'roll'

export interface StressRollingWindow {
  revision: number
  windowSize: number
  shiftCount: number
  startIndex: number
  endIndex: number
}

export interface StressPreparedInput {
  input: BenchmarkInput
  digest: string
  representedCount: number
  preparedRowCount: number
  exactMinimum?: number
  exactMaximum?: number
  rollingWindow?: StressRollingWindow
}
