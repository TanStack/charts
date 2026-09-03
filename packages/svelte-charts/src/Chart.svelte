<script
  lang="ts"
  generics="TDatum, TXValue extends ChartValue = ChartValue, TYValue extends ChartValue = ChartValue"
>
  import { onMount, untrack } from 'svelte'
  import { resolveChartAdapterLayout } from '@tanstack/charts/adapter'
  import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
  import { renderChartSvg } from '@tanstack/charts/svg'
  import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
  import type {
    ChartRenderContext,
    ChartRenderer,
    ChartRendererHostOptions,
    ChartRendererRenderContext,
    ChartSvgRenderer,
    ChartTooltipBodyTarget,
    ChartValue,
  } from '@tanstack/charts'
  import type { ChartProps } from './types'

  let props: ChartProps<TDatum, TXValue, TYValue> = $props()
  const generatedId = $props.id()
  const idPrefix = $derived(
    props.idPrefix ??
      `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`,
  )
  let activeRenderSvg = untrack(() => props.renderSvg ?? renderChartSvg)
  let renderer = createSvgChartRenderer<TDatum, TXValue, TYValue>(
    activeRenderSvg,
  )
  let tooltipBodyTarget = $state.raw<
    ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null
  >(null)
  const options = $derived(
    toHostOptions(
      props,
      idPrefix,
      resolveRenderer,
      props.tooltipBody ? handleTooltipBodyChange : undefined,
    ),
  )
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
  const adapter = untrack(() => createChartRendererAdapter(options))
  const initialMarkup = adapter.prerender()
  let container!: HTMLDivElement

  $effect(() => adapter.update(options))
  onMount(() => {
    adapter.mount(container)
    return () => adapter.destroy()
  })

  function toHostOptions(
    value: ChartProps<TDatum, TXValue, TYValue>,
    prefix: string,
    resolve: (
      renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
    ) => ChartRenderer<TDatum, TXValue, TYValue>,
    onTooltipBodyChange:
      | ((
          target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
        ) => void)
      | undefined,
  ): ChartRendererHostOptions<TDatum, TXValue, TYValue> {
    const {
      class: _class,
      style: _style,
      tooltipBody: _tooltipBody,
      renderSvg,
      onRender,
      ...hostOptions
    } = value
    return {
      ...hostOptions,
      idPrefix: prefix,
      renderer: resolve(renderSvg ?? renderChartSvg),
      onRender: adaptOnRender(onRender),
      onTooltipBodyChange,
    }
  }

  function resolveRenderer(
    renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
  ) {
    if (renderSvg !== activeRenderSvg) {
      activeRenderSvg = renderSvg
      renderer = createSvgChartRenderer(renderSvg)
    }
    return renderer
  }

  function adaptOnRender(
    onRender:
      | ((context: ChartRenderContext<TDatum, TXValue, TYValue>) => void)
      | undefined,
  ) {
    if (!onRender) return undefined
    return (
      context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
    ): void => {
      const svg = context.surface.defaultElement ?? context.surface.element
      const SvgElement =
        context.container.ownerDocument.defaultView?.SVGSVGElement
      if (!SvgElement || !(svg instanceof SvgElement)) {
        throw new TypeError('Expected the SVG chart surface.')
      }
      onRender({
        container: context.container,
        scene: context.scene,
        surface: context.surface,
        svg,
        interaction: context.interaction,
      })
    }
  }

  function handleTooltipBodyChange(
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
  ) {
    tooltipBodyTarget = target
  }

  function moveTooltipBody(node: HTMLElement, target: HTMLElement) {
    target.append(node)
    return {
      update(nextTarget: HTMLElement) {
        nextTarget.append(node)
      },
    }
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

{#if props.tooltipBody && tooltipBodyTarget}
  {@const target = tooltipBodyTarget}
  {#snippet tooltipSwatch(color: string)}
    <span
      class="ts-chart-tooltip__swatch"
      aria-hidden="true"
      style:display="block"
      style:width="0.55rem"
      style:height="0.55rem"
      style:border-radius="0.15rem"
      style:box-shadow="inset 0 0 0 1px rgb(0 0 0/.12)"
      style:background={color}
    ></span>
  {/snippet}

  {#snippet defaultBody()}
    {#if typeof target.content === 'string'}
      {target.content}
    {:else}
      {#if target.content.title}
        <div
          class="ts-chart-tooltip__title"
          style:display="flex"
          style:align-items="center"
          style:gap="0.4rem"
          style:font-weight="650"
          style:margin-bottom={target.content.rows.length ? '0.3rem' : 0}
        >
          {#if target.content.color}
            {@render tooltipSwatch(target.content.color)}
          {/if}
          {target.content.title}
        </div>
      {/if}
      {#if target.content.rows.length}
        <div class="ts-chart-tooltip__rows" aria-hidden="true">
          {#each target.content.rows as row}
            <div
              class="ts-chart-tooltip__row"
              style:display="grid"
              style:grid-template-columns="0.55rem minmax(0,1fr) auto"
              style:align-items="center"
              style:column-gap="0.4rem"
            >
              {#if row.color}
                {@render tooltipSwatch(row.color)}
              {:else}
                <span></span>
              {/if}
              <span>{row.label}</span>
              <span
                style:text-align="right"
                style:font-variant-numeric="tabular-nums"
                style:white-space="nowrap">{row.value}</span
              >
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {/snippet}

  <div
    class="ts-chart-tooltip__adapter-body"
    style:display="contents"
    use:moveTooltipBody={target.element}
  >
    {@render
      props.tooltipBody({
        points: target.points,
        content: target.content,
        pinned: target.pinned,
        dismiss: target.dismiss,
        defaultBody,
      })}
  </div>
{/if}
