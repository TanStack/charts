import { useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { FocusMotionRow } from './model'
import { crosshair, defineChart, dot, lineY } from '@tanstack/charts'
import { focusGroupX } from '@tanstack/charts/focus'
import { scaleBand, scaleLinear } from 'd3-scale'
import { focusMotionPeriods, focusMotionRows, focusMotionSeries } from './model'
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const colors = ['#7c3aed', '#0891b2', '#ea580c']

const focusSpring = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 22,
  mass: 0.72,
}

export function focusCursorMotionDefinition() {
  return defineChart({
    marks: [
      lineY(focusMotionRows, {
        id: 'series-lines',
        x: 'period',
        y: 'value',
        z: 'series',
        color: 'series',
        key: 'id',
        strokeWidth: 2.5,
        strokeOpacity: 0.68,
        states: [
          {
            when: { focus: 'unmatched' },
            style: { opacity: 0.12, strokeWidth: 1.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'series' },
            style: { opacity: 1, strokeOpacity: 1, strokeWidth: 4.5 },
            transition: focusSpring,
          },
        ],
      }),
      dot(focusMotionRows, {
        id: 'series-points',
        x: 'period',
        y: 'value',
        z: 'series',
        color: 'series',
        key: 'id',
        r: 4,
        stroke: 'Canvas',
        strokeWidth: 1.5,
        states: [
          {
            when: { focus: 'unmatched' },
            style: { opacity: 0.14, r: 2.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'group' },
            style: { opacity: 0.88, r: 5.5 },
            transition: focusSpring,
          },
          {
            when: { focus: 'primary' },
            style: { opacity: 1, r: 9, strokeWidth: 3 },
            transition: focusSpring,
          },
        ],
      }),
      crosshair<string, number>({
        id: 'focus-motion-crosshair',
        stroke: 'CanvasText',
        strokeOpacity: 0.48,
        strokeWidth: 1,
        strokeDasharray: '4 4',
        x: {
          label: {
            format: (value) => String(value),
            offset: 8,
            fill: 'CanvasText',
            fontSize: 10,
            fontWeight: 700,
          },
        },
        y: {
          label: {
            format: (value) => String(value),
            offset: 22,
            fill: 'CanvasText',
            fontSize: 10,
            fontWeight: 700,
          },
        },
        marker: {
          radius: 5,
          fill: 'Canvas',
          stroke: 'CanvasText',
          strokeWidth: 1.5,
        },
        motion: {
          transition: {
            type: 'spring',
            stiffness: 320,
            damping: 28,
            mass: 0.72,
            restDelta: 0.02,
            restSpeed: 0.02,
          },
        },
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(focusMotionPeriods).padding(0.1),
    },
    y: { scale: scaleLinear().domain([20, 90]), grid: true },
    color: { domain: focusMotionSeries, range: colors },
    focus: focusGroupX,
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: false,
    keyboard: true,
    margin: { top: 24, right: 26, bottom: 38, left: 46 },
  })
}

export default function FocusCursorMotionExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '117-focus-cursor-motion'
  const viewRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<ChartScene<FocusMotionRow, string, number>>(null)

  const [focused, setFocused] = useState<
    readonly ChartPoint<FocusMotionRow, string, number>[]
  >([])

  const renderer = useMemo(() => motion({ initial: false }), [])

  const definition = useMemo(focusCursorMotionDefinition, [])

  const primary = focused[0]

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
}
