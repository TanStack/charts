import { mountChart } from '@tanstack/charts/dom'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import type {
  ZoomXChange,
  ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'

export const window = controlledSignal<
  ZoomXWindow<number>,
  ZoomXChange<number>
>({ start: 0, end: 10 }, () => {})

export const horizontalZoom = zoomX({
  window,
  extent: [0, 10],
  scaleExtent: [1, 8],
})

export { mountChart }
