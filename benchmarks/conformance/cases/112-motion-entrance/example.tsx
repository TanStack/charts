import { useMemo, useRef, useState } from 'react'
import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { scaleBand, scaleLinear } from 'd3-scale'
import { ControlBar, ControlButton, ControlField, RangeField } from './controls'
import { entranceRows as rows } from './model'
import type { ChartMotionTweenTransition } from '@tanstack/charts'

export interface MotionSettings {
  duration: number
  staggerMs: number
  easing: ChartMotionTweenTransition['easing']
  customTiming: boolean
}

const initialSettings: MotionSettings = {
  duration: 1_100,
  staggerMs: 55,
  easing: undefined,
  customTiming: true,
}

export function motionEntranceDefinition(settings: MotionSettings) {
  const { duration, easing, staggerMs, customTiming } = settings
  return defineChart({
    motion: {
      transition: { type: 'tween', duration, easing },
    },
    marks: [
      barY(rows, {
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 7,
        inset: 4,
        motion(context) {
          if (customTiming && context.datum?.featured) {
            return {
              delay: duration * 0.19,
              transition: { type: 'tween', duration: duration * 0.64 },
            }
          }
          return { delay: context.datumIndex * staggerMs }
        },
      }),
      lineY(rows, {
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: customTiming
          ? {
              delay: duration * 0.1,
              transition: { type: 'tween', duration: duration * 0.78 },
            }
          : undefined,
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  })
}

function readEasing(value: string): MotionSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export default function MotionEntranceExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '112-motion-entrance'
  const viewRef = useRef<HTMLDivElement>(null)

  const replayRef = useRef<HTMLButtonElement>(null)

  const [settings, setSettings] = useState(initialSettings)

  const [replayCount, setReplayCount] = useState(1)

  const renderer = useMemo(() => motion(), [replayCount])

  const definition = useMemo(
    () => motionEntranceDefinition(settings),
    [settings],
  )

  const replay = () => setReplayCount((value) => value + 1)

  const changeSettings = (next: Partial<MotionSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    replay()
  }

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        width: input.width,
        height: input.height,
        color: 'CanvasText',
      }}
    >
      <ControlBar label="Entrance motion controls">
        <RangeField
          label="Duration"
          min={300}
          max={1_800}
          step={100}
          suffix=" ms"
          value={settings.duration}
          onChange={(duration) => changeSettings({ duration })}
        />
        <RangeField
          label="Stagger"
          min={0}
          max={120}
          step={5}
          suffix=" ms"
          value={settings.staggerMs}
          onChange={(staggerMs) => changeSettings({ staggerMs })}
        />
        <ControlField label="Easing">
          <select
            value={
              typeof settings.easing === 'string' ? settings.easing : 'polished'
            }
            onChange={(event) =>
              changeSettings({ easing: readEasing(event.currentTarget.value) })
            }
          >
            <option value="polished">Polished</option>
            <option value="ease">Ease</option>
            <option value="ease-out">Ease out</option>
            <option value="ease-in-out">Ease in/out</option>
            <option value="linear">Linear</option>
          </select>
        </ControlField>
        <ControlField label="Apr + line timing">
          <input
            type="checkbox"
            checked={settings.customTiming}
            onChange={(event) =>
              changeSettings({ customTiming: event.currentTarget.checked })
            }
          />
        </ControlField>
        <ControlButton ref={replayRef} onClick={replay}>
          Replay
        </ControlButton>
      </ControlBar>
      <Chart
        key={replayCount}
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={Math.max(180, input.height - 58)}
        ariaLabel="Staggered monthly actuals and target"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
