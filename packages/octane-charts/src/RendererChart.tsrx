import { memo, useId, useLayoutEffect, useMemo, useRef } from 'octane'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import type {
  ChartAdapter,
  ChartRendererHostCommonOptions,
  ChartRendererHostOptions,
  ChartValue,
} from '@tanstack/charts'
import type {
  DynamicRendererChartProps,
  RendererChartProps,
  StaticRendererChartProps,
} from './renderer-types'

interface ChartSurfaceProps {
  markup: string
  containerRef: { current: HTMLDivElement | null }
}

const ChartSurface = memo(
  function ChartSurface(props: ChartSurfaceProps) {
    return (
      <div
        ref={props.containerRef}
        class="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: props.markup }}
      />
    )
  },
  () => true,
)

export function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticRendererChartProps<TDatum, TXValue, TYValue>): unknown
export function RendererChart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicRendererChartProps<TDatum, TInput, TXValue, TYValue>): unknown
export function RendererChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TInput, TXValue, TYValue>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const adapterRef = useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TInput, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  const onFocusChangeRef = useRef(props.onFocusChange)
  onFocusChangeRef.current = props.onFocusChange
  const onSelectRef = useRef(props.onSelect)
  onSelectRef.current = props.onSelect
  const onFocusGroupChangeRef = useRef(props.onFocusGroupChange)
  onFocusGroupChangeRef.current = props.onFocusGroupChange
  const onRenderRef = useRef(props.onRender)
  onRenderRef.current = props.onRender
  const initialWidth = props.initialWidth ?? 640
  const height = props.height
  const aspectRatio =
    typeof props.aspectRatio === 'number' &&
    Number.isFinite(props.aspectRatio) &&
    props.aspectRatio > 0
      ? props.aspectRatio
      : undefined
  const maxFocusDistance = props.maxFocusDistance ?? 48
  const keyboard = props.keyboard ?? true
  const generatedId = useId()
  const idPrefix =
    props.idPrefix ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const hostOptions = useMemo<
    ChartRendererHostOptions<TDatum, TInput, TXValue, TYValue>
  >(
    () =>
      createHostOptions(props, {
        renderer: props.renderer,
        ariaLabel: props.ariaLabel,
        ariaDescription: props.ariaDescription,
        height,
        aspectRatio,
        width: props.width,
        initialWidth,
        maxFocusDistance,
        focus: props.focus,
        spatialIndex: props.spatialIndex,
        animate: props.animate,
        keyboard,
        tabIndex: props.tabIndex,
        idPrefix,
        measureText: props.measureText,
        tooltip: props.tooltip,
        onFocusChange: (point) => onFocusChangeRef.current?.(point),
        onFocusGroupChange: (points) => onFocusGroupChangeRef.current?.(points),
        onSelect: (point) => onSelectRef.current?.(point),
        onRender: (context) => onRenderRef.current?.(context),
      }),
    [
      props.definition,
      props.input,
      props.ariaLabel,
      props.ariaDescription,
      props.width,
      height,
      aspectRatio,
      initialWidth,
      maxFocusDistance,
      props.focus,
      props.spatialIndex,
      props.animate,
      keyboard,
      props.tabIndex,
      idPrefix,
      props.renderer,
      props.tooltip,
      props.measureText,
    ],
  )
  adapterRef.current ??= createChartRendererAdapter(hostOptions)
  const adapter = adapterRef.current
  const initialMarkupRef = useRef<string | null>(null)
  initialMarkupRef.current ??= adapter.prerender()

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    adapter.update(hostOptions)
    adapter.mount(container)
    return () => adapter.destroy()
  }, [])

  useLayoutEffect(() => {
    adapter.update(hostOptions)
  }, [adapter, hostOptions])

  return (
    <div
      class={props.class ? `ts-chart-host ${props.class}` : 'ts-chart-host'}
      style={{
        position: 'relative',
        width: props.width === undefined ? '100%' : props.width,
        height: height ?? (aspectRatio ? undefined : 320),
        aspectRatio: height === undefined ? aspectRatio : undefined,
        ...props.style,
      }}
    >
      <ChartSurface
        markup={initialMarkupRef.current}
        containerRef={containerRef}
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
