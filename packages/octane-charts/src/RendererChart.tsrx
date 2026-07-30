import {
  createPortal,
  memo,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'octane'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import type {
  ChartAdapter,
  ChartRendererHostCommonOptions,
  ChartRendererHostOptions,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import type { RendererChartProps } from './renderer-types'

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
>(props: RendererChartProps<TDatum, TXValue, TYValue>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const adapterRef = useRef<ChartAdapter<
    ChartRendererHostOptions<TDatum, TXValue, TYValue>,
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
  const [tooltipBodyTarget, setTooltipBodyTarget] =
    useState<ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null>(null)
  const initialWidth = props.initialWidth ?? 640
  const height = props.height
  const aspectRatio =
    typeof props.aspectRatio === 'number' &&
    Number.isFinite(props.aspectRatio) &&
    props.aspectRatio > 0
      ? props.aspectRatio
      : undefined
  const generatedId = useId()
  const idPrefix =
    props.idPrefix ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const hostOptions = useMemo<ChartRendererHostOptions<TDatum, TXValue, TYValue>>(
    () => ({
        renderer: props.renderer,
        definition: props.definition,
        ariaLabel: props.ariaLabel,
        ariaDescription: props.ariaDescription,
        height,
        aspectRatio,
        width: props.width,
        initialWidth,
        tabIndex: props.tabIndex,
        idPrefix,
        measureText: props.measureText,
        onFocusChange: (point) => onFocusChangeRef.current?.(point),
        onFocusGroupChange: (points) => onFocusGroupChangeRef.current?.(points),
        onSelect: (point) => onSelectRef.current?.(point),
        onRender: (context) => onRenderRef.current?.(context),
        onTooltipBodyChange: props.renderTooltipBody
          ? setTooltipBodyTarget
          : undefined,
      }),
    [
      props.definition,
      props.ariaLabel,
      props.ariaDescription,
      props.width,
      height,
      aspectRatio,
      initialWidth,
      props.tabIndex,
      idPrefix,
      props.renderer,
      props.measureText,
      Boolean(props.renderTooltipBody),
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

  const tooltipPortal =
    props.renderTooltipBody && tooltipBodyTarget
      ? createPortal(
          props.renderTooltipBody({
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
          class="ts-chart-tooltip__title"
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
        <div class="ts-chart-tooltip__rows" aria-hidden="true">
          {content.rows.map((row, index) => (
            <div
              class="ts-chart-tooltip__row"
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
      class="ts-chart-tooltip__swatch"
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
