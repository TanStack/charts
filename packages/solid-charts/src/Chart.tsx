/** @jsxImportSource solid-js */
import { createEffect, createUniqueId, onCleanup, onMount } from 'solid-js'
import type { JSX } from 'solid-js'
import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type { ChartHostOptions, ChartValue } from '@tanstack/charts'
import type { ChartProps } from './types'

export function Chart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TInput, TXValue, TYValue>): JSX.Element {
  const generatedId = createUniqueId()
  const generatedPrefix = `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const options = () => toHostOptions(props, props.idPrefix ?? generatedPrefix)
  const adapter = createChartAdapter(options())
  const initialMarkup = adapter.prerender()
  let container!: HTMLDivElement

  createEffect(() => adapter.update(options()))
  onMount(() => adapter.mount(container))
  onCleanup(() => adapter.destroy())

  const layout = () => resolveChartAdapterLayout(props)

  return (
    <div
      class={props.class ? `ts-chart-host ${props.class}` : 'ts-chart-host'}
      style={{
        position: 'relative',
        width: props.width === undefined ? '100%' : `${props.width}px`,
        height:
          props.height !== undefined
            ? `${props.height}px`
            : layout().aspectRatio === undefined
              ? '320px'
              : undefined,
        'aspect-ratio':
          props.height === undefined
            ? layout().aspectRatio?.toString()
            : undefined,
        ...props.style,
      }}
    >
      <div
        ref={container}
        class="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        innerHTML={initialMarkup}
      />
    </div>
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
  const { class: _class, style: _style, ...options } = props
  return { ...options, idPrefix }
}
