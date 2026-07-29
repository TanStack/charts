import * as React from 'react'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import type {
  ChartDefinition,
  ChartAnimationOptions,
  ChartRenderer,
  ChartRendererHostCommonOptions,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartPoint,
  ChartFocusMode,
  ChartRuntime,
  ChartSpatialIndexFactory,
  ChartTextMeasurer,
  ChartTooltipOptions,
  ChartValue,
  DynamicChartDefinition,
  StaticChartDefinition,
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
  renderer: ChartRenderer<any, any, any>
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
      renderer,
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
      __html: renderer.prerender(scene, {
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
  const initialSceneWidth = width ?? initialWidth
  const initialHeight =
    height ??
    (resolvedAspectRatio ? initialSceneWidth / resolvedAspectRatio : 320)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<ChartRendererHost<
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
  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const host = mountChartRenderer(container, hostOptions, runtime)
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
        renderer={renderer}
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
