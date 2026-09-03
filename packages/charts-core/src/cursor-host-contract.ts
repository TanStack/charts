import type {
  ChartCursorBinding,
  ChartCursorController,
  ChartCursorExtensionToken,
  ChartCursorPresentation,
  ChartCursorState,
  ChartFocusSource,
  ChartFocusState,
  ChartFocusStrategy,
  ChartPoint,
  ChartScene,
  ChartValue,
} from './types'

export interface ChartCursorHostSession<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  readonly controller: ChartCursorController<TXValue, TYValue>
  getState: () => ChartCursorState<TXValue, TYValue> | null
  subscribe: (listener: () => void) => () => void
  owns: (state: ChartCursorState<TXValue, TYValue> | null) => boolean
  publish: (state: ChartCursorState<TXValue, TYValue>) => void
  clearOwnedTransient: () => boolean
  clear: () => void
  destroy: () => void
  resolvePresentation: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    binding: ChartCursorBinding<TDatum, TXValue, TYValue>,
    state: ChartCursorState<TXValue, TYValue> | null,
  ) => ChartCursorPresentation<TXValue, TYValue> | null
  resolveFocus: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    binding: Extract<
      ChartCursorBinding<TDatum, TXValue, TYValue>,
      { mode: 'focus' }
    >,
    state: ChartCursorState<TXValue, TYValue> | null,
    strategy?: ChartFocusStrategy<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  createFocusState: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    binding: Extract<
      ChartCursorBinding<TDatum, TXValue, TYValue>,
      { mode: 'focus' }
    >,
    focus: ChartFocusState<TDatum, TXValue, TYValue>,
  ) => ChartCursorState<TXValue, TYValue>
  createFreeState: (
    scene: ChartScene<TDatum, TXValue, TYValue>,
    binding: Extract<
      ChartCursorBinding<TDatum, TXValue, TYValue>,
      { mode: 'free' }
    >,
    position: Readonly<{ x: number; y: number }>,
    source?: ChartFocusSource,
    pinned?: boolean,
  ) => ChartCursorState<TXValue, TYValue>
}

export interface ChartCursorHostExtension extends ChartCursorExtensionToken {
  create: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    controller: ChartCursorController<TXValue, TYValue>,
  ) => ChartCursorHostSession<TDatum, TXValue, TYValue>
}

export function createChartCursorHostSession<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  binding: ChartCursorBinding<TDatum, TXValue, TYValue>,
): ChartCursorHostSession<TDatum, TXValue, TYValue> {
  const extension = binding.use as ChartCursorHostExtension
  if (extension.__chartExtensionType !== 'cursor') {
    throw new TypeError('A chart cursor requires a cursor host extension.')
  }
  return extension.create<TDatum, TXValue, TYValue>(binding.controller)
}
