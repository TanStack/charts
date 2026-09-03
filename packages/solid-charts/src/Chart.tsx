/** @jsxImportSource solid-js */
import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
} from 'solid-js'
import { Portal } from 'solid-js/web'
import type { Accessor, JSX } from 'solid-js'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartRenderer,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps, ChartTooltipBodyRenderContext } from './types'

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>): JSX.Element {
  const generatedId = createUniqueId()
  const generatedPrefix = `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const renderer = createMemo(() =>
    createSvgChartRenderer<TDatum, TXValue, TYValue>(
      props.renderSvg ?? renderChartSvg,
    ),
  )
  const [tooltipBodyTarget, setTooltipBodyTarget] =
    createSignal<ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null>(null)
  const options = () =>
    toHostOptions(
      props,
      props.idPrefix ?? generatedPrefix,
      renderer(),
      setTooltipBodyTarget,
    )
  const adapter = createChartRendererAdapter(options())
  const initialMarkup = adapter.prerender()
  let container!: HTMLDivElement

  createEffect(() => adapter.update(options()))
  onMount(() => adapter.mount(container))
  onCleanup(() => adapter.destroy())

  const aspectRatio = () =>
    typeof props.aspectRatio === 'number' &&
    Number.isFinite(props.aspectRatio) &&
    props.aspectRatio > 0
      ? props.aspectRatio
      : undefined

  return (
    <>
      <div
        class={props.class ? `ts-chart-host ${props.class}` : 'ts-chart-host'}
        style={{
          position: 'relative',
          width: props.width === undefined ? '100%' : `${props.width}px`,
          height:
            props.height !== undefined
              ? `${props.height}px`
              : aspectRatio() === undefined
                ? '320px'
                : undefined,
          'aspect-ratio':
            props.height === undefined ? aspectRatio()?.toString() : undefined,
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
      <Show when={props.renderTooltipBody} keyed>
        {(renderTooltipBody) => (
          <Show when={tooltipBodyTarget()}>
            {(target) => (
              <TooltipBodyPortal render={renderTooltipBody} target={target} />
            )}
          </Show>
        )}
      </Show>
    </>
  )
}

function toHostOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: ChartProps<TDatum, TXValue, TYValue>,
  idPrefix: string,
  renderer: ChartRenderer<TDatum, TXValue, TYValue>,
  onTooltipBodyChange: (
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
  ) => void,
): ChartRendererHostOptions<TDatum, TXValue, TYValue> {
  const {
    class: _class,
    style: _style,
    renderSvg: _renderSvg,
    renderTooltipBody,
    onRender,
    ...options
  } = props
  const handleRender = onRender
    ? (context: ChartRendererRenderContext<TDatum, TXValue, TYValue>): void => {
        const element =
          context.surface.defaultElement ?? context.surface.element
        const SvgElement =
          context.container.ownerDocument.defaultView?.SVGSVGElement
        if (!SvgElement || !(element instanceof SvgElement)) {
          throw new TypeError('Expected the SVG chart surface.')
        }
        onRender({
          container: context.container,
          scene: context.scene,
          surface: context.surface,
          svg: element,
          interaction: context.interaction,
        })
      }
    : undefined

  return {
    ...options,
    idPrefix,
    renderer,
    onRender: handleRender,
    onTooltipBodyChange: renderTooltipBody ? onTooltipBodyChange : undefined,
  }
}

function TooltipBodyPortal<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(props: {
  render: NonNullable<ChartProps<TDatum, TXValue, TYValue>['renderTooltipBody']>
  target: Accessor<ChartTooltipBodyTarget<TDatum, TXValue, TYValue>>
}): JSX.Element {
  const defaultBody = <DefaultTooltipBody content={props.target().content} />
  const context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue> = {
    get points() {
      return props.target().points
    },
    get content() {
      return props.target().content
    },
    defaultBody,
    get pinned() {
      return props.target().pinned
    },
    get dismiss() {
      return props.target().dismiss
    },
  }
  const body = props.render(context)

  return <Portal mount={props.target().element}>{body}</Portal>
}

function DefaultTooltipBody(props: {
  content: ChartTooltipContent | string
}): JSX.Element {
  return (
    <>
      {() => {
        const content = props.content
        return typeof content === 'string' ? (
          content
        ) : (
          <StructuredTooltipBody content={content} />
        )
      }}
    </>
  )
}

function StructuredTooltipBody(props: {
  content: ChartTooltipContent
}): JSX.Element {
  return (
    <>
      {props.content.title ? (
        <div
          class="ts-chart-tooltip__title"
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.4rem',
            'font-weight': 650,
            'margin-bottom': props.content.rows.length ? '0.3rem' : 0,
          }}
        >
          {props.content.color ? (
            <TooltipSwatch color={props.content.color} />
          ) : null}
          {props.content.title}
        </div>
      ) : null}
      {props.content.rows.length ? (
        <div class="ts-chart-tooltip__rows" aria-hidden="true">
          {props.content.rows.map((row) => (
            <div
              class="ts-chart-tooltip__row"
              style={{
                display: 'grid',
                'grid-template-columns': '0.55rem minmax(0,1fr) auto',
                'align-items': 'center',
                'column-gap': '0.4rem',
              }}
            >
              {row.color ? <TooltipSwatch color={row.color} /> : <span />}
              <span>{row.label}</span>
              <span
                style={{
                  'text-align': 'right',
                  'font-variant-numeric': 'tabular-nums',
                  'white-space': 'nowrap',
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

function TooltipSwatch(props: { color: string }): JSX.Element {
  return (
    <span
      class="ts-chart-tooltip__swatch"
      aria-hidden="true"
      style={{
        display: 'block',
        width: '0.55rem',
        height: '0.55rem',
        'border-radius': '0.15rem',
        'box-shadow': 'inset 0 0 0 1px rgb(0 0 0/.12)',
        background: props.color,
      }}
    />
  )
}
