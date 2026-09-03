export interface ControlledSignalChangeContext<TReason> {
  readonly reason: TReason
}

export interface ControlledSignal<TValue, TReason = unknown> {
  readonly value: TValue
  readonly onChange: (
    value: TValue,
    context: ControlledSignalChangeContext<TReason>,
  ) => void
}

/**
 * Describes application-owned state to a chart interaction without creating a
 * second store or subscription lifecycle inside Charts.
 */
export function controlledSignal<TValue, TReason = unknown>(
  value: TValue,
  onChange: (
    value: TValue,
    context: ControlledSignalChangeContext<TReason>,
  ) => void,
): ControlledSignal<TValue, TReason> {
  return { value, onChange }
}
