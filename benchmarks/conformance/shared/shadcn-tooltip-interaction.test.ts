import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, it, vi } from 'vitest'
import Advanced, {
  definition as advanced,
} from '../cases/132-shadcn-tooltip-advanced/example'
import Default, {
  definition as standard,
} from '../cases/190-shadcn-tooltip-default/example'
import Formatter, {
  definition as formatter,
} from '../cases/191-shadcn-tooltip-formatter/example'
import Icons, {
  definition as icons,
} from '../cases/192-shadcn-tooltip-icons/example'
import Line, {
  definition as line,
} from '../cases/193-shadcn-tooltip-indicator-line/example'
import NoIndicator, {
  definition as noIndicator,
} from '../cases/194-shadcn-tooltip-indicator-none/example'
import CustomLabel, {
  definition as customLabel,
} from '../cases/195-shadcn-tooltip-label-custom/example'
import LabelFormatter, {
  definition as labelFormatter,
} from '../cases/196-shadcn-tooltip-label-formatter/example'
import NoLabel, {
  definition as noLabel,
} from '../cases/197-shadcn-tooltip-label-none/example'

const examples = [
  ['advanced', Advanced, advanced],
  ['default', Default, standard],
  ['formatter', Formatter, formatter],
  ['icons', Icons, icons],
  ['line indicator', Line, line],
  ['no indicator', NoIndicator, noIndicator],
  ['custom label', CustomLabel, customLabel],
  ['label formatter', LabelFormatter, labelFormatter],
  ['no label', NoLabel, noLabel],
] as const

describe('ShadCN tooltip examples', () => {
  it.each(examples)(
    'waits for interaction and follows the pointer in %s',
    async (_name, Example, definition) => {
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      const width = 590
      const height = (width * 9) / 16
      try {
        await act(async () =>
          root.render(createElement(Example, { width: 640 })),
        )
        const svg = container.querySelector('svg')
        if (!svg) throw new Error('Expected the example chart')
        expect(
          container.querySelector('.sc-chart-tooltip:not([hidden])'),
        ).toBeNull()
        vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: width,
          bottom: height,
          width,
          height,
          toJSON: () => ({}),
        })
        const point = createChartScene(definition, { width, height }).points[0]
        if (!point) throw new Error('Expected an activity bar')
        const move = async (y: number) => {
          await act(async () => {
            svg.dispatchEvent(
              new MouseEvent('pointermove', {
                bubbles: true,
                clientX: point.x,
                clientY: y,
              }),
            )
          })
        }
        await move(80)
        await vi.waitFor(() =>
          expect(
            container.querySelector('.sc-chart-tooltip:not([hidden])'),
          ).not.toBeNull(),
        )
        const tooltip =
          container.querySelector<HTMLElement>('.sc-chart-tooltip')
        if (!tooltip) throw new Error('Expected the active tooltip')
        const firstTop = tooltip.style.top
        await move(120)
        await vi.waitFor(() => expect(tooltip.style.top).not.toBe(firstTop))
        await act(async () =>
          svg.parentElement?.dispatchEvent(new MouseEvent('mouseleave')),
        )
        await vi.waitFor(() => expect(tooltip.hidden).toBe(true))
      } finally {
        await act(async () => root.unmount())
        container.remove()
      }
    },
  )
})
