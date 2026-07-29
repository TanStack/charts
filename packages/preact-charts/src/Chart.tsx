/** @jsxImportSource preact */
import { useId, useLayoutEffect, useMemo, useRef } from 'preact/hooks'
import type { JSX } from 'preact'
import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type {
  ChartAdapter,
  ChartHostOptions,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps, DynamicChartProps, StaticChartProps } from './types'

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): JSX.Element
export function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>): JSX.Element
export function Chart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TInput, TXValue, TYValue>) {
  const generatedId = useId()
  const idPrefix =
    props.idPrefix ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const options = useMemo(
    () => toHostOptions(props, idPrefix),
    [props, idPrefix],
  )
  const adapterRef = useRef<ChartAdapter<
    ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  adapterRef.current ??= createChartAdapter(options)
  const adapter = adapterRef.current
  const initialMarkupRef = useRef<string | null>(null)
  initialMarkupRef.current ??= adapter.prerender()
  const containerRef = useRef<HTMLDivElement>(null)
  const layout = resolveChartAdapterLayout(props)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    adapter.mount(container)
    return () => adapter.destroy()
  }, [])

  useLayoutEffect(() => {
    adapter.update(options)
  }, [adapter, options])

  return (
    <div
      className={
        props.className ? `ts-chart-host ${props.className}` : 'ts-chart-host'
      }
      style={hostStyle(props, layout)}
    >
      <div
        ref={containerRef}
        className="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: initialMarkupRef.current }}
      />
    </div>
  )
}

function hostStyle(
  props: ChartProps<any, any, any, any>,
  layout: ReturnType<typeof resolveChartAdapterLayout>,
): JSX.CSSProperties {
  return Object.assign(
    {
      position: 'relative',
      width: props.width === undefined ? '100%' : props.width,
      height:
        props.height ?? (layout.aspectRatio === undefined ? 320 : undefined),
      aspectRatio: props.height === undefined ? layout.aspectRatio : undefined,
    } satisfies JSX.CSSProperties,
    props.style,
  )
}

function toHostOptions<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: ChartProps<TDatum, TInput, TXValue, TYValue>,
  idPrefix: string,
): ChartHostOptions<TDatum, TInput, TXValue, TYValue> {
  const { className: _className, style: _style, ...options } = props
  return { ...options, idPrefix }
}
