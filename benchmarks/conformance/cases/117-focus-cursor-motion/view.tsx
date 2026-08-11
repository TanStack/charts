import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { readChartMotionState } from '../../shared/motion'
import { reactMount } from '../../shared/react-mount'
import { focusMotionPeriods, focusMotionSeries } from './model'
import { focusCursorMotionDefinition } from './tanstack'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { FocusMotionRow } from './model'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const FocusCursorMotionExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FocusCursorMotionExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChartScene<FocusMotionRow, string, number>>(null)
  const [focused, setFocused] = useState<
    readonly ChartPoint<FocusMotionRow, string, number>[]
  >([])
  const renderer = useMemo(
    () => motion<FocusMotionRow, string, number>({ initial: false }),
    [],
  )
  const definition = useMemo(focusCursorMotionDefinition, [])
  const primary = focused[0]

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.view && target.view !== 'main') return null
        const scene = sceneRef.current
        const surface = viewRef.current
        const period = target.anchor.startsWith('period:')
          ? target.anchor.slice('period:'.length)
          : focusMotionPeriods[Number(target.anchor.split(':').at(-1))]
        const point = scene?.points.find(
          (candidate) =>
            candidate.datum.period === period &&
            candidate.datum.series === focusMotionSeries[0],
        )
        const svg = surface?.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!point || !scene || !svg) return null
        const bounds = svg.getBoundingClientRect()
        return {
          x: bounds.left + (point.x / scene.width) * bounds.width,
          y: bounds.top + (point.y / scene.height) * bounds.height,
          focusElement: svg,
        }
      },
      readState() {
        const surface = viewRef.current
        const layer = surface?.querySelector<SVGGElement>(
          '[data-ts-focus-guide-layer="over"]',
        )
        const xRule = layer?.querySelector<SVGLineElement>(
          '[data-ts-key="focus-motion-crosshair:x-rule"]',
        )
        const marker = layer?.querySelector<SVGCircleElement>(
          '[data-ts-key="focus-motion-crosshair:marker"]',
        )
        const xLabel = layer?.querySelector<SVGTextElement>(
          '[data-ts-key="focus-motion-crosshair:x-label:text"]',
        )
        const yLabel = layer?.querySelector<SVGTextElement>(
          '[data-ts-key="focus-motion-crosshair:y-label:text"]',
        )
        const crosshairX = Number(xRule?.getAttribute('x1'))
        const crosshairY = Number(marker?.getAttribute('cy'))
        return {
          focused: primary?.datum.id ?? null,
          groupSize: focused.length,
          crosshairVisible:
            layer?.getAttribute('visibility') !== 'hidden' && Boolean(xRule),
          crosshairX,
          crosshairY,
          crosshairXLabel: xLabel?.textContent ?? '',
          crosshairYLabel: yLabel?.textContent ?? '',
          crosshairFinite:
            Number.isFinite(crosshairX) && Number.isFinite(crosshairY),
          crosshairSettled:
            Boolean(primary) &&
            Math.abs(crosshairX - (primary?.x ?? 0)) < 0.1 &&
            Math.abs(crosshairY - (primary?.y ?? 0)) < 0.1,
          focusMotionState: surface ? readChartMotionState(surface) : null,
        }
      },
    }),
    [focused, primary],
  )

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={input.height}
        ariaLabel="Grouped line chart with animated focus and crosshair"
        ariaDescription="Move across the chart or use the arrow keys. The nearest point, shared period, focused series, and remaining marks animate separately."
        onFocusGroupChange={setFocused}
        onRender={(context) => {
          sceneRef.current = context.scene
        }}
      />
      <output
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          zIndex: 2,
          width: 180,
          marginLeft: -90,
          overflow: 'hidden',
          color: 'CanvasText',
          font: '600 10px/1.4 system-ui, sans-serif',
          textAlign: 'center',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {primary
          ? `${primary.datum.period} · ${primary.datum.series} · ${focused.length} grouped`
          : 'Hover or use ← →'}
      </output>
    </div>
  )
})

export const mount = reactMount(FocusCursorMotionExample)
