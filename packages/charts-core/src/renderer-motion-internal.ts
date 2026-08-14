import type { ChartRenderer, ChartTooltipExtensionContext } from './dom-types'
import type { ChartMotionTransition, ChartValue } from './types'

export const chartRendererMotion = Symbol('tanstack-charts-renderer-motion')

export interface ChartTooltipMotionSnapshot {
  wasHidden: boolean
  showPresence: boolean
  previousLeft?: number
  previousTop?: number
  movementX: number
  movementY: number
  velocityX: number
  velocityY: number
  presence?: { opacity: number; scale: number }
}

export interface ChartTooltipMotionController {
  beforePaint: (element: HTMLElement) => ChartTooltipMotionSnapshot
  afterPaint: (
    element: HTMLElement,
    snapshot: ChartTooltipMotionSnapshot,
    transition: false | ChartMotionTransition | undefined,
  ) => void
  hide: (
    element: HTMLElement,
    transition: false | ChartMotionTransition | undefined,
    complete: () => void,
  ) => boolean
  destroy: (element: HTMLElement | undefined) => void
}

export interface ChartRendererMotionCapability {
  createTooltip: (context: {
    container: HTMLElement
    transition: () => false | ChartMotionTransition | undefined
  }) => ChartTooltipMotionController
}

type MotionRenderer = ChartRenderer<any, any, any> & {
  [chartRendererMotion]?: ChartRendererMotionCapability
}

type MotionTooltipContext = ChartTooltipExtensionContext<any, any, any> & {
  [chartRendererMotion]?: ChartTooltipMotionController
}

export function rendererMotionCapability(
  renderer: ChartRenderer<any, any, any>,
): ChartRendererMotionCapability | undefined {
  return (renderer as MotionRenderer)[chartRendererMotion]
}

export function tooltipMotionController<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  context: ChartTooltipExtensionContext<TDatum, TXValue, TYValue>,
): ChartTooltipMotionController | undefined {
  return (context as MotionTooltipContext)[chartRendererMotion]
}

export function connectRendererTooltipMotion<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  renderer: ChartRenderer<TDatum, TXValue, TYValue>,
  context: ChartTooltipExtensionContext<TDatum, TXValue, TYValue>,
  transition: () => false | ChartMotionTransition | undefined,
) {
  const capability = rendererMotionCapability(renderer)
  if (capability) {
    const motionContext = context as MotionTooltipContext
    motionContext[chartRendererMotion] = capability.createTooltip({
      container: context.container,
      transition,
    })
  }
  return context
}
