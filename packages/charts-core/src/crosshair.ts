import { resolveCrosshairGuide } from './crosshair-resolver'
import { createMark } from './mark'
import { valueKey } from './scales'
import type {
  ChartMark,
  ChartMarkMotionOptions,
  ChartValue,
  ResolvedScale,
  SceneFocusGuideAxis,
  SceneFocusGuideBand,
  SceneFocusGuideLabel,
  SceneFocusGuideMarker,
  SceneStyle,
} from './types'

export { resolveCrosshairGuide }

export interface CrosshairRuleOptions {
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
}

export interface CrosshairLabelOptions<TValue extends ChartValue = ChartValue> {
  format?: (value: TValue) => string
  offset?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  opacity?: number
  fontSize?: number
  fontWeight?: number
}

/** Paint for a categorical cursor band that replaces one crosshair rule. */
export interface CrosshairBandOptions {
  /** Inset from both scale-band edges. Negative values create an outset. */
  inset?: number
  radius?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  opacity?: number
}

export interface CrosshairAxisOptions<
  TValue extends ChartValue = ChartValue,
> extends CrosshairRuleOptions {
  label?: boolean | CrosshairLabelOptions<TValue>
  /** Paints the categorical scale band instead of an axis rule. */
  band?: boolean | CrosshairBandOptions
}

export interface CrosshairMarkerOptions {
  radius?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  opacity?: number
}

export interface CrosshairOptions<
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>
  extends ChartMarkMotionOptions<never>, CrosshairRuleOptions {
  id?: string
  /** Draws the vertical guide at the focused x position. Defaults to true. */
  x?: boolean | CrosshairAxisOptions<TXValue>
  /** Draws the horizontal guide at the focused y position. Defaults to true. */
  y?: boolean | CrosshairAxisOptions<TYValue>
  /** Draws a marker at the primary focused point. Defaults to false. */
  marker?: boolean | CrosshairMarkerOptions
}

/** Draws renderer-native guides from the chart's existing focus state. */
export function crosshair<
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  options: CrosshairOptions<TXValue, TYValue> = {},
): ChartMark<never, never, never, never, never> {
  return createMark<never, never, never>(({ markIndex }) => {
    const id = options.id ?? `crosshair-${markIndex}`

    return {
      id,
      focusGuideOnly: true,
      channels: {},
      render: ({ chart, surface, scales, theme, layout }) => ({
        nodes: [],
        focusGuides: [
          {
            key: id,
            markId: id,
            chart,
            surface,
            x: resolveAxis(options.x, options, theme.foreground, scales.x),
            y: resolveAxis(options.y, options, theme.foreground, scales.y),
            marker: resolveMarker(options.marker),
            projectX: projector(scales.x),
            projectY: projector(scales.y),
            motion: options.motion,
            measureText: layout.measureText,
            resolve: resolveCrosshairGuide,
          },
        ],
      }),
    }
  }, options.motion)
}

function resolveAxis<TValue extends ChartValue>(
  input: boolean | CrosshairAxisOptions<TValue> | undefined,
  shared: CrosshairRuleOptions,
  fallbackStroke: string,
  scale: ResolvedScale | undefined,
): SceneFocusGuideAxis | undefined {
  if (input === false) return undefined
  const options = typeof input === 'object' ? input : undefined
  return {
    style: resolveRuleStyle(shared, options, fallbackStroke),
    label: resolveLabel(options?.label, fallbackStroke, scale),
    band: resolveBand(options?.band, fallbackStroke, scale),
  }
}

function resolveBand(
  input: boolean | CrosshairBandOptions | undefined,
  fallbackFill: string,
  scale: ResolvedScale | undefined,
): SceneFocusGuideBand | undefined {
  if (!input) return undefined
  const options = typeof input === 'object' ? input : undefined
  return {
    bandwidth: finiteNonnegative(scale?.bandwidth, 0),
    inset: finite(options?.inset, 0),
    radius:
      options?.radius === undefined
        ? undefined
        : finiteNonnegative(options.radius, 0),
    style: {
      fill: options?.fill ?? fallbackFill,
      fillOpacity: options?.fillOpacity ?? 0.12,
      stroke: options?.stroke,
      strokeOpacity: options?.strokeOpacity,
      strokeWidth:
        options?.strokeWidth === undefined
          ? undefined
          : finiteNonnegative(options.strokeWidth, 0),
      opacity: options?.opacity,
    },
  }
}

function resolveRuleStyle(
  shared: CrosshairRuleOptions,
  axis: CrosshairRuleOptions | undefined,
  fallbackStroke: string,
): SceneStyle {
  return {
    stroke: axis?.stroke ?? shared.stroke ?? fallbackStroke,
    strokeOpacity: axis?.strokeOpacity ?? shared.strokeOpacity ?? 0.35,
    strokeWidth: finiteNonnegative(axis?.strokeWidth ?? shared.strokeWidth, 1),
    strokeDasharray: axis?.strokeDasharray ?? shared.strokeDasharray,
  }
}

function resolveLabel<TValue extends ChartValue>(
  input: boolean | CrosshairLabelOptions<TValue> | undefined,
  fallbackFill: string,
  scale: ResolvedScale | undefined,
): SceneFocusGuideLabel | undefined {
  if (!input) return undefined
  const options = typeof input === 'object' ? input : undefined
  return {
    format: options?.format
      ? (value) => options.format!(value as TValue)
      : scale
        ? (value) => formatScaleValue(scale, value)
        : undefined,
    offset: finiteNonnegative(options?.offset, 8),
    fontSize: finiteNonnegative(options?.fontSize, 11),
    fontWeight: options?.fontWeight,
    style: {
      fill: options?.fill ?? fallbackFill,
      fillOpacity: options?.fillOpacity,
      stroke: options?.stroke ?? 'var(--ts-chart-crosshair-label-halo, Canvas)',
      strokeOpacity: options?.strokeOpacity,
      strokeWidth: finiteNonnegative(options?.strokeWidth, 3),
      opacity: options?.opacity,
    },
  }
}

function projector(scale: ResolvedScale | undefined) {
  return scale && scale.type !== 'none'
    ? (value: ChartValue) => {
        const position = scale.map(value)
        return Number.isFinite(position) ? position : undefined
      }
    : undefined
}

function formatScaleValue(scale: ResolvedScale, value: ChartValue) {
  const identity = valueKey(value)
  const tick = scale.ticks.find(
    (candidate) => valueKey(candidate.value) === identity,
  )
  if (tick) return tick.label
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}

function resolveMarker(
  input: boolean | CrosshairMarkerOptions | undefined,
): SceneFocusGuideMarker | undefined {
  if (!input) return undefined
  const options = typeof input === 'object' ? input : undefined
  return {
    radius: finiteNonnegative(options?.radius, 4),
    style: {
      fill: options?.fill ?? 'var(--ts-chart-crosshair-marker-fill, Canvas)',
      fillOpacity: options?.fillOpacity,
      stroke: options?.stroke,
      strokeOpacity: options?.strokeOpacity,
      strokeWidth: finiteNonnegative(options?.strokeWidth, 2),
      opacity: options?.opacity,
    },
  }
}

function finiteNonnegative(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function finite(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
