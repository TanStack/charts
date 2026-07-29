<script
  lang="ts"
  generics="TDatum, TInput = undefined, TXValue extends ChartValue = ChartValue, TYValue extends ChartValue = ChartValue"
>
  import { onMount, untrack } from 'svelte'
  import {
    createChartAdapter,
    resolveChartAdapterLayout,
  } from '@tanstack/charts/adapter'
  import type { ChartHostOptions, ChartValue } from '@tanstack/charts'
  import type { ChartProps } from './types'

  let props: ChartProps<TDatum, TInput, TXValue, TYValue> = $props()
  const generatedId = $props.id()
  const idPrefix = $derived(
    props.idPrefix ??
      `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`,
  )
  const options = $derived(toHostOptions(props, idPrefix))
  const layout = $derived(resolveChartAdapterLayout(props))
  const outerStyle = $derived(
    [
      'position:relative',
      `width:${props.width === undefined ? '100%' : `${props.width}px`}`,
      props.height !== undefined
        ? `height:${props.height}px`
        : layout.aspectRatio === undefined
          ? 'height:320px'
          : `aspect-ratio:${layout.aspectRatio}`,
      props.style,
    ]
      .filter(Boolean)
      .join(';'),
  )
  const adapter = untrack(() => createChartAdapter(options))
  const initialMarkup = adapter.prerender()
  let container!: HTMLDivElement

  $effect(() => adapter.update(options))
  onMount(() => {
    adapter.mount(container)
    return () => adapter.destroy()
  })

  function toHostOptions(
    value: ChartProps<TDatum, TInput, TXValue, TYValue>,
    prefix: string,
  ): ChartHostOptions<TDatum, TInput, TXValue, TYValue> {
    const { class: _class, style: _style, ...hostOptions } = value
    return { ...hostOptions, idPrefix: prefix }
  }
</script>

<div
  class={props.class ? `ts-chart-host ${props.class}` : 'ts-chart-host'}
  style={outerStyle}
>
  <div
    bind:this={container}
    class="ts-chart-surface"
    style="width:100%;height:100%"
  >
    {@html initialMarkup}
  </div>
</div>
