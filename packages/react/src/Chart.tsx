import * as React from 'react'
import {
  chartSizingStyle,
  createChartController,
  type ChartController,
  type ChartControllerOptions,
  type ChartRenderer,
  type ChartSize,
  type ChartSizing,
  type ChartThemeInput,
  type ChartRenderMetrics,
} from '@plot-poc/host-core'

export interface ChartProps<TData, TValue = unknown> {
  data: TData
  renderer: ChartRenderer<TData, TValue>
  sizing: ChartSizing
  theme?: ChartThemeInput
  initialSize?: Partial<ChartSize>
  ariaLabel: string
  ariaDescription?: string
  className?: string
  style?: React.CSSProperties
  tabIndex?: number
  onError?: (error: unknown) => void
  onRender?: (metrics: ChartRenderMetrics) => void
  onValueChange?: (value: TValue | undefined) => void
}

export function Chart<TData, TValue = unknown>({
  data,
  renderer,
  sizing,
  theme = 'auto',
  initialSize,
  ariaLabel,
  ariaDescription,
  className,
  style,
  tabIndex,
  onError,
  onRender,
  onValueChange,
}: ChartProps<TData, TValue>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const controllerRef = React.useRef<ChartController<TData, TValue> | null>(
    null,
  )
  const lastAppliedOptions = React.useRef<ChartControllerOptions<
    TData,
    TValue
  > | null>(null)

  const controllerOptions = React.useMemo<
    ChartControllerOptions<TData, TValue>
  >(
    () => ({
      data,
      renderer,
      sizing,
      theme,
      initialSize,
      onError,
      onRender,
      onValueChange,
    }),
    [
      data,
      renderer,
      sizing,
      theme,
      initialSize,
      onError,
      onRender,
      onValueChange,
    ],
  )

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const controller = createChartController(container, controllerOptions)
    controllerRef.current = controller
    lastAppliedOptions.current = controllerOptions

    return () => {
      controller.destroy()
      controllerRef.current = null
      lastAppliedOptions.current = null
    }
  }, [])

  React.useLayoutEffect(() => {
    if (
      !controllerRef.current ||
      lastAppliedOptions.current === controllerOptions
    ) {
      return
    }

    controllerRef.current.update(controllerOptions)
    lastAppliedOptions.current = controllerOptions
  }, [controllerOptions])

  return (
    <div
      ref={containerRef}
      className={className ? `ts-plot ${className}` : 'ts-plot'}
      style={{
        ...chartSizingStyle(sizing),
        ...style,
      }}
      role="group"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      tabIndex={tabIndex}
    />
  )
}
