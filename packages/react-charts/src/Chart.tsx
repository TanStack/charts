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
  type DynamicChartDefinition,
  type StaticChartDefinition,
} from '@tanstack/charts'

interface ChartSurfaceProps {
  definition: ChartDefinition<unknown, unknown, any>
  input: unknown
  ariaLabel: string
  ariaDescription?: string
  height: number
  width?: number
  initialWidth: number
  keyboard: boolean
  idPrefix: string
  renderSvg: ChartSvgRenderer
  runtime: ChartRuntime<unknown, unknown>
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
      initialWidth,
      keyboard,
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
        width: width ?? initialWidth,
        height,
      },
      { measureText },
    )
    const markup = {
      __html: renderSvg(scene, {
        ariaLabel,
        ariaDescription,
        tabIndex: keyboard ? 0 : -1,
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

export interface ChartCommonProps<TDatum = unknown> {
  ariaLabel: string
  ariaDescription?: string
  height?: number
  aspectRatio?: number
  width?: number
  initialWidth?: number
  className?: string
  style?: React.CSSProperties
  maxFocusDistance?: number
  focus?: ChartFocusMode
  spatialIndex?: ChartSpatialIndexFactory<TDatum>
  animate?: boolean | ChartAnimationOptions
  keyboard?: boolean
  idPrefix?: string
  renderSvg?: ChartSvgRenderer
  measureText?: ChartTextMeasurer
  tooltip?: boolean | ChartTooltipOptions<TDatum>
  onFocusChange?: (point: ChartPoint<TDatum> | null) => void
  onFocusGroupChange?: (points: readonly ChartPoint<TDatum>[]) => void
  onSelect?: (point: ChartPoint<TDatum> | null) => void
  onRender?: (context: ChartRenderContext<TDatum>) => void
}

export type StaticChartProps<TDatum = unknown> = ChartCommonProps<TDatum> & {
  definition: StaticChartDefinition<TDatum>
  input?: never
}

export type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
> = ChartCommonProps<TDatum> & {
  definition: DynamicChartDefinition<TInput, any, TDatum>
  input: TInput
}

export type ChartProps<TDatum = unknown, TInput = undefined> =
  StaticChartProps<TDatum> | DynamicChartProps<TDatum, TInput>

export function Chart<TDatum>(
  props: StaticChartProps<TDatum>,
): React.JSX.Element
export function Chart<TDatum, TInput>(
  props: DynamicChartProps<TDatum, TInput>,
): React.JSX.Element
export function Chart<TDatum, TInput = undefined>(
  props: ChartProps<TDatum, TInput>,
) {
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
  const initialHeight =
    height ??
    (aspectRatio && aspectRatio > 0 ? initialWidth / aspectRatio : 320)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<ChartHost<TDatum, TInput> | null>(null)
  const runtimeRef = React.useRef<ChartRuntime<TDatum, TInput> | null>(null)
  runtimeRef.current ??= createChartRuntime<TDatum, TInput>()
  const runtime = runtimeRef.current
  const commonHostOptions: ChartHostCommonOptions<TDatum> = {
    ariaLabel,
    ariaDescription,
    height,
    aspectRatio,
    width,
    initialWidth,
    maxFocusDistance,
    focus,
    spatialIndex,
    animate,
    keyboard,
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
        height: height ?? (aspectRatio ? undefined : 320),
        aspectRatio: height === undefined ? aspectRatio : undefined,
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
        width={width}
        initialWidth={initialWidth}
        keyboard={keyboard}
        idPrefix={idPrefix}
        renderSvg={renderSvg}
        runtime={runtime as ChartRuntime<unknown, unknown>}
        measureText={measureText}
      />
    </div>
  )
}

function createHostOptions<TDatum, TInput>(
  props: ChartProps<TDatum, TInput>,
  common: ChartHostCommonOptions<TDatum>,
): ChartHostOptions<TDatum, TInput> {
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

function isDynamicProps<TDatum, TInput>(
  props: ChartProps<TDatum, TInput>,
): props is DynamicChartProps<TDatum, TInput> {
  return 'chart' in props.definition
}
