import * as React from 'react'
import {
  createChartRuntime,
  mountChart,
  renderChartSvg,
  type ChartDefinition,
  type ChartAnimationOptions,
  type ChartHostCommonOptions,
  type ChartHost,
  type ChartHostOptions,
  type ChartPoint,
  type ChartFocusMode,
  type ChartRenderContext,
  type ChartRuntime,
  type ChartSpatialIndexFactory,
  type ChartSvgRenderer,
  type ChartTextMeasurer,
  type ChartTooltipOptions,
  type ChartValue,
  type DynamicChartDefinition,
  type StaticChartDefinition,
} from '@tanstack/charts'

interface ChartSurfaceProps {
  definition: ChartDefinition<unknown, unknown, any>
  input: unknown
  ariaLabel: string
  ariaDescription?: string
  height: number
  width: number
  keyboard: boolean
  tabIndex?: number
  idPrefix: string
  renderSvg: ChartSvgRenderer<any, any, any>
  runtime: ChartRuntime<any, any, any, any>
  measureText?: ChartTextMeasurer
}

const ChartSurface = React.memo(
  React.forwardRef<HTMLDivElement, ChartSurfaceProps>(function ChartSurface(
    {
      definition,
      input,
      ariaLabel,
      ariaDescription,
      height,
      width,
      keyboard,
      tabIndex,
      idPrefix,
      renderSvg,
      runtime,
      measureText,
    },
    ref,
  ) {
    const scene = runtime.render(
      definition,
      input,
      {
        width,
        height,
      },
      { measureText },
    )
    const markup = {
      __html: renderSvg(scene, {
        ariaLabel,
        ariaDescription,
        tabIndex: keyboard ? (tabIndex ?? 0) : -1,
        idPrefix,
      }),
    }

    return (
      <div
        ref={ref}
        className="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={markup}
      />
    )
  }),
  () => true,
)

export interface ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
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
  renderSvg?: ChartSvgRenderer<
    NoInfer<TDatum>,
    NoInfer<TXValue>,
    NoInfer<TYValue>
  >
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum, TXValue, TYValue>
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (context: ChartRenderContext<TDatum, TXValue, TYValue>) => void
}

export type StaticChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

export type ChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticChartProps<TDatum, TXValue, TYValue>
  | DynamicChartProps<TDatum, TInput, TXValue, TYValue>

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): React.JSX.Element
export function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>): React.JSX.Element
export function Chart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TInput, TXValue, TYValue>) {
  const {
    definition,
    input,
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
    renderSvg = renderChartSvg,
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
  const initialSceneWidth = width ?? initialWidth
  const initialHeight =
    height ??
    (resolvedAspectRatio ? initialSceneWidth / resolvedAspectRatio : 320)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<ChartHost<
    TDatum,
    TInput,
    TXValue,
    TYValue
  > | null>(null)
  const runtimeRef = React.useRef<ChartRuntime<
    TDatum,
    TInput,
    TXValue,
    TYValue
  > | null>(null)
  runtimeRef.current ??= createChartRuntime<TDatum, TInput, TXValue, TYValue>()
  const runtime = runtimeRef.current
  const commonHostOptions: ChartHostCommonOptions<TDatum, TXValue, TYValue> = {
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
    renderSvg,
    measureText,
    tooltip,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
  }
  const hostOptions = createHostOptions(props, commonHostOptions)
  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const host = mountChart(container, hostOptions, runtime)
    hostRef.current = host
    return () => {
      hostRef.current = null
      host.destroy()
    }
  }, [])

  React.useLayoutEffect(() => {
    hostRef.current?.update(hostOptions)
  }, [hostOptions])

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
      <ChartSurface
        ref={containerRef}
        definition={definition as ChartDefinition<unknown, unknown, any>}
        input={input}
        ariaLabel={ariaLabel}
        ariaDescription={ariaDescription}
        height={initialHeight}
        width={initialSceneWidth}
        keyboard={keyboard}
        tabIndex={tabIndex}
        idPrefix={idPrefix}
        renderSvg={renderSvg}
        runtime={runtime as ChartRuntime<any, any, any, any>}
        measureText={measureText}
      />
    </div>
  )
}

function createHostOptions<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: ChartProps<TDatum, TInput, TXValue, TYValue>,
  common: ChartHostCommonOptions<TDatum, TXValue, TYValue>,
): ChartHostOptions<TDatum, TInput, TXValue, TYValue> {
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
  props: ChartProps<TDatum, TInput, TXValue, TYValue>,
): props is DynamicChartProps<TDatum, TInput, TXValue, TYValue> {
  return 'chart' in props.definition
}
