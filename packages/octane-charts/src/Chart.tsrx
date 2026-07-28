import { memo, useId, useLayoutEffect, useMemo, useRef } from 'octane'
import {
  createChartRuntime,
  mountChart,
  renderChartSvg,
} from '@tanstack/charts'
import type {
  ChartDefinition,
  ChartHost,
  ChartHostCommonOptions,
  ChartHostOptions,
  ChartPoint,
  ChartRuntime,
  ChartSvgRenderer,
  ChartTextMeasurer,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps, DynamicChartProps, StaticChartProps } from './types'

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
  containerRef: { current: HTMLDivElement | null }
}

const ChartSurface = memo(
  function ChartSurface(props: ChartSurfaceProps) {
    const scene = props.runtime.render(
      props.definition,
      props.input,
      {
        width: props.width,
        height: props.height,
      },
      { measureText: props.measureText },
    )
    const markup = {
      __html: props.renderSvg(scene, {
        ariaLabel: props.ariaLabel,
        ariaDescription: props.ariaDescription,
        tabIndex: props.keyboard ? (props.tabIndex ?? 0) : -1,
        idPrefix: props.idPrefix,
      }),
    }

    return (
      <div
        ref={props.containerRef}
        class="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={markup}
      />
    )
  },
  () => true,
)

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): unknown
export function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>,
): unknown
export function Chart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  props: ChartProps<TDatum, TInput, TXValue, TYValue>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<
    ChartHost<TDatum, TInput, TXValue, TYValue> | null
  >(null)
  const runtimeRef = useRef<
    ChartRuntime<TDatum, TInput, TXValue, TYValue> | null
  >(null)
  runtimeRef.current ??= createChartRuntime<
    TDatum,
    TInput,
    TXValue,
    TYValue
  >()
  const runtime = runtimeRef.current
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
  const initialSceneWidth = props.width ?? initialWidth
  const initialHeight =
    height ??
    (aspectRatio ? initialSceneWidth / aspectRatio : 320)
  const maxFocusDistance = props.maxFocusDistance ?? 48
  const keyboard = props.keyboard ?? true
  const generatedId = useId()
  const idPrefix =
    props.idPrefix ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const renderSvg = props.renderSvg ?? renderChartSvg
  const hostOptions = useMemo<
    ChartHostOptions<TDatum, TInput, TXValue, TYValue>
  >(
    () =>
      createHostOptions(props, {
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
        renderSvg,
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
      renderSvg,
      props.tooltip,
      props.measureText,
    ],
  )
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const host = mountChart(container, hostOptions, runtime)
    hostRef.current = host
    return () => {
      hostRef.current = null
      host.destroy()
    }
  }, [])

  useLayoutEffect(() => {
    hostRef.current?.update(hostOptions)
  }, [hostOptions])

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
        definition={props.definition as ChartDefinition<unknown, unknown, any>}
        input={props.input}
        ariaLabel={props.ariaLabel}
        ariaDescription={props.ariaDescription}
        height={initialHeight}
        width={initialSceneWidth}
        keyboard={keyboard}
        tabIndex={props.tabIndex}
        idPrefix={idPrefix}
        renderSvg={renderSvg}
        runtime={runtime as ChartRuntime<any, any, any, any>}
        measureText={props.measureText}
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
