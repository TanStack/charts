import { createMark } from './mark'
import type { ChartMark, ChartMarkMotionOptions } from './types'

export interface FrameOptions extends ChartMarkMotionOptions<never> {
  id?: string
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  inset?: number
  radius?: number
}

/** Draws a background or border around the resolved inner chart bounds. */
export function frame(
  options: FrameOptions = {},
): ChartMark<never, never, never> {
  return createMark<never, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `frame-${markIndex}`
      return {
        id,
        channels: {},
        render: ({ chart, theme }) => {
          const inset = Math.max(0, options.inset ?? 0)
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: 'ts-chart__frame',
                ariaHidden: true,
                children: [
                  {
                    kind: 'rect',
                    key: `${id}:rect`,
                    x: chart.x + inset,
                    y: chart.y + inset,
                    width: Math.max(0, chart.width - inset * 2),
                    height: Math.max(0, chart.height - inset * 2),
                    radius: options.radius,
                    style: {
                      fill: options.fill ?? 'none',
                      fillOpacity: options.fillOpacity,
                      stroke: options.stroke ?? theme.foreground,
                      strokeOpacity: options.strokeOpacity ?? 0.35,
                      strokeWidth: options.strokeWidth ?? 1,
                    },
                  },
                ],
              },
            ],
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}
