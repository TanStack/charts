import * as React from 'react'
import { createPortal } from 'react-dom'
import type {
  ChartTooltipBodyContext,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import {
  ChartImplementation,
  type ChartCommonProps as BaseChartCommonProps,
  type ChartProps as BaseChartProps,
} from './Chart'
import {
  CanvasChartImplementation,
  type CanvasChartCommonProps as BaseCanvasChartCommonProps,
  type CanvasChartProps as BaseCanvasChartProps,
} from './CanvasChart'
import {
  RendererChartImplementation,
  type RendererChartCommonProps as BaseRendererChartCommonProps,
  type RendererChartProps as BaseRendererChartProps,
} from './RendererChart'

export interface ChartTooltipBodyRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: React.ReactNode
}

export interface ChartTooltipBodyRenderProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => React.ReactNode
}

export type ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseChartCommonProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseChartProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type RendererChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseRendererChartCommonProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type RendererChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseRendererChartProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type CanvasChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseCanvasChartCommonProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export type CanvasChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = BaseCanvasChartProps<TDatum, TXValue, TYValue> &
  ChartTooltipBodyRenderProps<TDatum, TXValue, TYValue>

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>) {
  const { renderTooltipBody, ...chartProps } = props
  const tooltipBody = useTooltipBody(renderTooltipBody)
  return (
    <>
      <ChartImplementation
        {...chartProps}
        onTooltipBodyChange={tooltipBody.onChange}
      />
      {tooltipBody.portal}
    </>
  )
}

export function RendererChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: RendererChartProps<TDatum, TXValue, TYValue>) {
  const { renderTooltipBody, ...chartProps } = props
  const tooltipBody = useTooltipBody(renderTooltipBody)
  return (
    <>
      <RendererChartImplementation
        {...chartProps}
        onTooltipBodyChange={tooltipBody.onChange}
      />
      {tooltipBody.portal}
    </>
  )
}

export function CanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: CanvasChartProps<TDatum, TXValue, TYValue>) {
  const { renderTooltipBody, ...chartProps } = props
  const tooltipBody = useTooltipBody(renderTooltipBody)
  return (
    <>
      <CanvasChartImplementation
        {...chartProps}
        onTooltipBodyChange={tooltipBody.onChange}
      />
      {tooltipBody.portal}
    </>
  )
}

function useTooltipBody<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  renderTooltipBody:
    | ((
        context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
      ) => React.ReactNode)
    | undefined,
) {
  const [target, setTarget] = React.useState<ChartTooltipBodyTarget<
    TDatum,
    TXValue,
    TYValue
  > | null>(null)
  const onChange = React.useCallback(
    (nextTarget: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null) => {
      setTarget(nextTarget)
    },
    [],
  )
  return {
    onChange: renderTooltipBody ? onChange : undefined,
    portal:
      renderTooltipBody && target
        ? createPortal(
            renderTooltipBody({
              points: target.points,
              content: target.content,
              pinned: target.pinned,
              dismiss: target.dismiss,
              defaultBody: <DefaultTooltipBody content={target.content} />,
            }),
            target.element,
          )
        : null,
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

export type { ChartDefinition, ChartPoint } from '@tanstack/charts'
