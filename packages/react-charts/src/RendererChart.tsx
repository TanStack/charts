import * as React from 'react'
import { createPortal } from 'react-dom'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import type {
  ChartAdapter,
  ChartRenderer,
  ChartRendererHostCommonOptions,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartPoint,
  ChartTextMeasurer,
  ChartTooltipBodyContext,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
  ChartDefinition,
} from '@tanstack/charts'

interface ChartSurfaceProps {
  markup: string
}

const ChartSurface = React.memo(
  React.forwardRef<HTMLDivElement, ChartSurfaceProps>(function ChartSurface(
    { markup },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="ts-chart-surface"
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: markup }}
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
  tabIndex?: number
  idPrefix?: string
  measureText?: ChartTextMeasurer
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ) => void
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => React.ReactNode
}

export interface ChartTooltipBodyRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: React.ReactNode
}

export type RendererChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = RendererChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}

export function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TXValue, TYValue>) {
  return <RendererChartImplementation {...props} />
}

export function RendererChartImplementation<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TXValue, TYValue>) {
  const {
    ariaLabel,
    ariaDescription,
    height,
    aspectRatio,
    width,
    initialWidth = 640,
    className,
    style,
    tabIndex,
    idPrefix: idPrefixOption,
    renderer,
    measureText,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
    renderTooltipBody,
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const adapterRef = React.useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  const [tooltipBodyTarget, setTooltipBodyTarget] =
    React.useState<ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null>(
      null,
    )
  const handleTooltipBodyChange = React.useCallback(
    (target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null) => {
      setTooltipBodyTarget(target)
    },
    [],
  )
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
    tabIndex,
    idPrefix,
    measureText,
    onFocusChange,
    onFocusGroupChange,
    onSelect,
    onRender,
    onTooltipBodyChange: renderTooltipBody
      ? handleTooltipBodyChange
      : undefined,
  }
  const hostOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue> = {
    ...commonHostOptions,
    definition: props.definition,
  }
  adapterRef.current ??= createChartRendererAdapter(hostOptions)
  const adapter = adapterRef.current
  const initialMarkupRef = React.useRef<string | null>(null)
  initialMarkupRef.current ??= adapter.prerender()

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    adapter.update(hostOptions)
    adapter.mount(container)
    return () => adapter.destroy()
  }, [])

  React.useLayoutEffect(() => {
    adapter.update(hostOptions)
  }, [adapter, hostOptions])

  const tooltipPortal =
    renderTooltipBody && tooltipBodyTarget
      ? createPortal(
          renderTooltipBody({
            points: tooltipBodyTarget.points,
            content: tooltipBodyTarget.content,
            pinned: tooltipBodyTarget.pinned,
            dismiss: tooltipBodyTarget.dismiss,
            defaultBody: (
              <DefaultTooltipBody content={tooltipBodyTarget.content} />
            ),
          }),
          tooltipBodyTarget.element,
        )
      : null

  return (
    <>
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
        <ChartSurface ref={containerRef} markup={initialMarkupRef.current} />
      </div>
      {tooltipPortal}
    </>
  )
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
