/** @jsxImportSource preact */
import { createPortal } from 'preact/compat'
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartAdapter,
  ChartRenderer,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps } from './types'

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>) {
  const generatedId = useId()
  const idPrefix =
    props.idPrefix ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const renderer = useMemo(
    () =>
      createSvgChartRenderer<TDatum, TXValue, TYValue>(
        props.renderSvg ?? renderChartSvg,
      ),
    [props.renderSvg],
  )
  const [tooltipBodyTarget, setTooltipBodyTarget] =
    useState<ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null>(null)
  const options = useMemo(
    () => toHostOptions(props, idPrefix, renderer, setTooltipBodyTarget),
    [props, idPrefix, renderer],
  )
  const adapterRef = useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  adapterRef.current ??= createChartRendererAdapter(options)
  const adapter = adapterRef.current
  const initialMarkupRef = useRef<string | null>(null)
  initialMarkupRef.current ??= adapter.prerender()
  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatio = resolveAspectRatio(props.aspectRatio)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    adapter.mount(container)
    return () => adapter.destroy()
  }, [])

  useLayoutEffect(() => {
    adapter.update(options)
  }, [adapter, options])

  const tooltipPortal =
    props.renderTooltipBody && tooltipBodyTarget
      ? createPortal(
          props.renderTooltipBody({
            points: tooltipBodyTarget.points,
            content: tooltipBodyTarget.content,
            defaultBody: (
              <DefaultTooltipBody content={tooltipBodyTarget.content} />
            ),
            pinned: tooltipBodyTarget.pinned,
            dismiss: tooltipBodyTarget.dismiss,
          }),
          tooltipBodyTarget.element,
        )
      : null

  return (
    <>
      <div
        className={
          props.className ? `ts-chart-host ${props.className}` : 'ts-chart-host'
        }
        style={hostStyle(props, aspectRatio)}
      >
        <div
          ref={containerRef}
          className="ts-chart-surface"
          style={{ width: '100%', height: '100%' }}
          dangerouslySetInnerHTML={{ __html: initialMarkupRef.current }}
        />
      </div>
      {tooltipPortal}
    </>
  )
}

function resolveAspectRatio(aspectRatio: number | undefined) {
  return typeof aspectRatio === 'number' &&
    Number.isFinite(aspectRatio) &&
    aspectRatio > 0
    ? aspectRatio
    : undefined
}

function hostStyle(
  props: ChartProps<any, any, any>,
  aspectRatio: number | undefined,
): JSX.CSSProperties {
  return Object.assign(
    {
      position: 'relative',
      width: props.width === undefined ? '100%' : props.width,
      height: props.height ?? (aspectRatio === undefined ? 320 : undefined),
      aspectRatio: props.height === undefined ? aspectRatio : undefined,
    } satisfies JSX.CSSProperties,
    props.style,
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
    className: _className,
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

function DefaultTooltipBody({
  content,
}: {
  content: ChartTooltipContent | string
}) {
  if (typeof content === 'string') return content

  return (
    <>
      {content.title ? (
        <div
          className="ts-chart-tooltip__title"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 650,
            marginBottom: content.rows.length ? '0.3rem' : 0,
          }}
        >
          {content.color ? <TooltipSwatch color={content.color} /> : null}
          {content.title}
        </div>
      ) : null}
      {content.rows.length ? (
        <div className="ts-chart-tooltip__rows" aria-hidden="true">
          {content.rows.map((row, index) => (
            <div
              className="ts-chart-tooltip__row"
              key={`${row.label}\0${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '0.55rem minmax(0,1fr) auto',
                alignItems: 'center',
                columnGap: '0.4rem',
              }}
            >
              {row.color ? <TooltipSwatch color={row.color} /> : <span />}
              <span>{row.label}</span>
              <span
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
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

function TooltipSwatch({ color }: { color: string }) {
  return (
    <span
      className="ts-chart-tooltip__swatch"
      aria-hidden="true"
      style={{
        display: 'block',
        width: '0.55rem',
        height: '0.55rem',
        borderRadius: '0.15rem',
        boxShadow: 'inset 0 0 0 1px rgb(0 0 0/.12)',
        background: color,
      }}
    />
  )
}
