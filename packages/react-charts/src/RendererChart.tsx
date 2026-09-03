import * as React from 'react'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import type {
  ChartAdapter,
  ChartRenderer,
  ChartRendererHostCommonOptions,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartPoint,
  ChartTextMeasurer,
  ChartTooltipBodyTarget,
  ChartValue,
  DomChartDefinition,
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
  tabIndex?: number
  idPrefix?: string
  measureText?: ChartTextMeasurer
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ) => void
}

export type RendererChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DomChartDefinition<TDatum, TXValue, TYValue>
}

export type RendererChartImplementationProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartProps<TDatum, TXValue, TYValue> & {
  onTooltipBodyChange?: (
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
  ) => void
}

export function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TXValue, TYValue>) {
  return <RendererChartImplementation {...props} />
}

export function RendererChartImplementation<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartImplementationProps<TDatum, TXValue, TYValue>) {
  const {
    ariaLabel,
    ariaDescription,
    height,
    aspectRatio,
    width,
    initialWidth = 640,
    className,
    style,
    tabIndex,
    idPrefix: idPrefixOption,
    renderer,
    measureText,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
    onTooltipBodyChange,
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
  const cssAspectRatio =
    resolvedAspectRatio === undefined ? undefined : String(resolvedAspectRatio)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const adapterRef = React.useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TXValue, TYValue>,
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
    tabIndex,
    idPrefix,
    measureText,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
    onTooltipBodyChange,
  }
  const hostOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue> = {
    ...commonHostOptions,
    definition: props.definition,
  }
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
        aspectRatio: height === undefined ? cssAspectRatio : undefined,
        ...style,
      }}
    >
      <ChartSurface ref={containerRef} markup={initialMarkupRef.current} />
    </div>
  )
}
