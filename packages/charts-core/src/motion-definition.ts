import type {
  ChartMotionContext,
  ChartMotionPhase,
  ChartMotionRole,
  ChartMotionTiming,
} from './types'

export interface ChartMotionStaggerOptions {
  /** Index used to calculate the delay. Defaults to `datum`. */
  by?: 'datum' | 'series'
  /** Milliseconds between adjacent entries. */
  each: number
  /** Fixed milliseconds before the first entry. Defaults to zero. */
  offset?: number
  /** Restricts staggering to one or more lifecycle phases. Defaults to `enter`. */
  phase?: ChartMotionPhase | readonly ChartMotionPhase[]
  /** Restricts staggering to one or more semantic roles. */
  roles?: ChartMotionRole | readonly ChartMotionRole[]
}

/** Creates a delay timing field that composes through object spread. */
export function stagger<TDatum = unknown>(
  options: ChartMotionStaggerOptions,
): Pick<ChartMotionTiming<TDatum>, 'delay'> {
  const phases = values(options.phase ?? 'enter')
  const roles = options.roles === undefined ? undefined : values(options.roles)
  const each = nonNegative(options.each)
  const offset = nonNegative(options.offset ?? 0)
  return {
    delay(context: ChartMotionContext<TDatum>) {
      if (
        !phases.includes(context.phase) ||
        (roles !== undefined && !roles.includes(context.role))
      ) {
        return undefined
      }
      const index =
        options.by === 'series' ? context.seriesIndex : context.datumIndex
      return offset + each * Math.max(0, index)
    },
  }
}

function values<TValue>(value: TValue | readonly TValue[]): readonly TValue[] {
  return Array.isArray(value) ? value : [value as TValue]
}

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}
