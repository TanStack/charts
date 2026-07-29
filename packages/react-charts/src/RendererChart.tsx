import * as React from 'react'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import type {
  ChartAdapter,
  ChartAnimationOptions,
  ChartRenderer,
  ChartRendererHostCommonOptions,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartPoint,
  ChartFocusMode,
  ChartSpatialIndexFactory,
  ChartTextMeasurer,
  ChartTooltipOptions,
  ChartValue,
  DynamicChartDefinition,
  StaticChartDefinition,
} from '@tanstack/charts'

interface ChartSurfaceProps {
  markup: string
}

const ChartSurface = React.memo(
  React.forwardRef<HTMLDivElement, ChartSurfaceProps>(function ChartSurface(
    { markup },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    )
  }),
  () => true,
)

export interface RendererChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  renderer: ChartRenderer<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  className?: string
  style?: React.CSSProperties
  maxFocusDistance?: number
  focus?: ChartFocusMode<NoInfer<TDatum>, NoInfer<TXValue>, NoInfer<TYValue>>
  spatialIndex?: ChartSpatialIndexFactory<TDatum, TXValue, TYValue>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  tabIndex?: number
  idPrefix?: string
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ) => void
}

export type StaticRendererChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

export type DynamicRendererChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

export type RendererChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticRendererChartProps<TDatum, TXValue, TYValue>
  | DynamicRendererChartProps<TDatum, TInput, TXValue, TYValue>

export function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticRendererChartProps<TDatum, TXValue, TYValue>): React.JSX.Element
export function RendererChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  props: DynamicRendererChartProps<TDatum, TInput, TXValue, TYValue>,
): React.JSX.Element
export function RendererChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TInput, TXValue, TYValue>) {
  return <RendererChartImplementation {...props} />
}

export function RendererChartImplementation<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TInput, TXValue, TYValue>) {
  const {
    ariaLabel,
    ariaDescription,
    height,
    aspectRatio,
    width,
    initialWidth = 640,
    className,
    style,
    maxFocusDistance = 48,
    focus,
    spatialIndex,
    animate,
    keyboard = true,
    tabIndex,
    idPrefix: idPrefixOption,
    renderer,
    measureText,
    tooltip,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
  } = props
  const generatedId = React.useId()
  const idPrefix =
    idPrefixOption ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const resolvedAspectRatio =
    typeof aspectRatio === 'number' &&
    Number.isFinite(aspectRatio) &&
    aspectRatio > 0
      ? aspectRatio
      : undefined
  const containerRef = React.useRef<HTMLDivElement>(null)
  const adapterRef = React.useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TInput, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  const commonHostOptions: ChartRendererHostCommonOptions<
    TDatum,
    TXValue,
    TYValue
  > = {
    renderer,
    ariaLabel,
    ariaDescription,
    height,
    aspectRatio: resolvedAspectRatio,
    width,
    initialWidth,
    maxFocusDistance,
    focus,
    spatialIndex,
    animate,
    keyboard,
    tabIndex,
    idPrefix,
    measureText,
    tooltip,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
  }
  const hostOptions = createHostOptions(props, commonHostOptions)
  adapterRef.current ??= createChartRendererAdapter(hostOptions)
  const adapter = adapterRef.current
  const initialMarkupRef = React.useRef<string | null>(null)
  initialMarkupRef.current ??= adapter.prerender()

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    adapter.update(hostOptions)
    adapter.mount(container)
    return () => adapter.destroy()
  }, [])

  React.useLayoutEffect(() => {
    adapter.update(hostOptions)
  }, [adapter, hostOptions])

  return (
    <div
      className={className ? `ts-chart-host ${className}` : 'ts-chart-host'}
      style={{
        position: 'relative',
        width: width === undefined ? '100%' : width,
        height: height ?? (resolvedAspectRatio ? undefined : 320),
        aspectRatio: height === undefined ? resolvedAspectRatio : undefined,
        ...style,
      }}
    >
      <ChartSurface ref={containerRef} markup={initialMarkupRef.current} />
    </div>
  )
}

function createHostOptions<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: RendererChartProps<TDatum, TInput, TXValue, TYValue>,
  common: ChartRendererHostCommonOptions<TDatum, TXValue, TYValue>,
): ChartRendererHostOptions<TDatum, TInput, TXValue, TYValue> {
  if (isDynamicProps(props)) {
    return {
      ...common,
      definition: props.definition,
      input: props.input,
    }
  }
  return {
    ...common,
    definition: props.definition,
  }
}

function isDynamicProps<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: RendererChartProps<TDatum, TInput, TXValue, TYValue>,
): props is DynamicRendererChartProps<TDatum, TInput, TXValue, TYValue> {
  return 'chart' in props.definition
}
