import type { ChartValue, StaticChartDefinition } from '../types'

export type ChartJsonPrimitive = string | number | boolean | null

export type ChartJsonValue =
  | ChartJsonPrimitive
  | readonly ChartJsonValue[]
  | { readonly [key: string]: ChartJsonValue }

export interface ChartJsonMetadata {
  readonly title?: string
  readonly description?: string
}

export interface ChartJson {
  readonly $schema?: string
  readonly chartsVersion: string
  readonly spec: Readonly<Record<string, unknown>>
  readonly data?: Readonly<Record<string, readonly ChartJsonValue[]>>
  readonly metadata?: ChartJsonMetadata
}

export interface ChartFromJsonOptions {
  /** Values supplied here replace bundled values with the same names. */
  readonly data?: Readonly<Record<string, Iterable<unknown>>>
  /** Require the authored version to equal the installed Charts version. */
  readonly exactVersion?: boolean
}

export type ChartJsonIssueCode =
  | 'invalid-json'
  | 'invalid-envelope'
  | 'invalid-version'
  | 'incompatible-version'
  | 'invalid-node'
  | 'unknown-call'
  | 'invalid-arguments'
  | 'invalid-result'
  | 'missing-data'
  | 'invalid-data'
  | 'call-error'

export interface ChartJsonIssue {
  readonly code: ChartJsonIssueCode
  readonly path: string
  readonly message: string
  readonly callId?: string
}

export type ChartJsonSchema = boolean | Readonly<Record<string, unknown>>

export type ChartJsonDefinition = StaticChartDefinition<
  unknown,
  ChartValue,
  ChartValue,
  never
> & {
  readonly metadata?: ChartJsonMetadata
}
