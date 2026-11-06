import type {
  ChartTextMeasureOptions,
  ChartTextMetrics,
  SceneLabel,
} from './types'

export function labelBox(
  width: number,
  height: number,
  anchor: ChartTextMeasureOptions['anchor'] | undefined,
  baseline: ChartTextMeasureOptions['baseline'] | undefined,
): ChartTextMetrics {
  return {
    x: anchor === 'middle' ? -width / 2 : anchor === 'end' ? -width : 0,
    y:
      baseline === 'middle'
        ? -height / 2
        : baseline === 'hanging'
          ? 0
          : -height * 0.8,
    width,
    height,
  }
}

export function svgLabelBox(label: SceneLabel): ChartTextMetrics {
  const { width, height } = label.svg!
  return labelBox(
    finiteNonNegative(width, 0),
    finiteNonNegative(height, 0),
    label.anchor,
    label.baseline,
  )
}

export function finiteNonNegative(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) && value! >= 0 ? value! : fallback
}
