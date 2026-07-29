import type { ChartScene, ChartValue } from './types'

export interface ChartAdapterLayoutOptions {
  width?: number
  height?: number
  initialWidth?: number
  aspectRatio?: number
}

export interface ChartAdapterLayout {
  aspectRatio?: number
  initialWidth: number
  initialHeight: number
}

export interface ChartAdapter<
  TOptions,
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  prerender: () => string
  mount: (container: HTMLElement) => void
  update: (options: TOptions) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue> | undefined
  destroy: () => void
}

export function resolveChartAdapterLayout(
  options: ChartAdapterLayoutOptions,
): ChartAdapterLayout {
  const initialWidth = options.width ?? options.initialWidth ?? 640
  const aspectRatio =
    typeof options.aspectRatio === 'number' &&
    Number.isFinite(options.aspectRatio) &&
    options.aspectRatio > 0
      ? options.aspectRatio
      : undefined

  return {
    aspectRatio,
    initialWidth,
    initialHeight:
      options.height ??
      (aspectRatio === undefined ? 320 : initialWidth / aspectRatio),
  }
}
