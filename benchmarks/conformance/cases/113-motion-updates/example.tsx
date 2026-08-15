import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { ControlBar, ControlButton, ControlField, RangeField } from './controls'
import { updateStages as stages } from './model'
import type { UpdateRow } from './model'
import { barY, defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { ChartMotionTweenTransition } from '@tanstack/charts/motion'
const initialSettings: UpdateSettings = {
  duration: 1_100,
  easing: undefined,
  spring: false,
  stiffness: 170,
  damping: 14,
  mass: 1,
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export interface UpdateSettings {
  duration: number
  easing: ChartMotionTweenTransition['easing']
  spring: boolean
  stiffness: number
  damping: number
  mass: number
}

export function motionUpdatesDefinition(
  rows: readonly UpdateRow[],
  settings: UpdateSettings,
) {
  return defineChart({
    motion: {
      transition: settings.spring
        ? {
            type: 'spring',
            stiffness: settings.stiffness,
            damping: settings.damping,
            mass: settings.mass,
          }
        : {
            type: 'tween',
            duration: settings.duration,
            easing: settings.easing,
          },
    },
    marks: [
      barY(rows, {
        id: 'actual',
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 7,
        inset: 4,
        motion(context) {
          if (settings.spring) {
            if (context.phase === 'exit') {
              return {
                transition: {
                  type: 'spring',
                  stiffness: settings.stiffness * 1.25,
                  damping: settings.damping * 1.15,
                },
              }
            }
            if (context.datum?.featured) {
              return {
                delay: context.phase === 'enter' ? 70 : 0,
                transition: {
                  type: 'spring',
                  mass: settings.mass * 1.35,
                },
              }
            }
            return undefined
          }
          if (context.phase === 'exit') {
            return {
              transition: {
                type: 'tween',
                duration: settings.duration * 0.45,
              },
            }
          }
          if (context.datum?.featured) {
            return {
              delay: settings.duration * 0.16,
              transition: {
                type: 'tween',
                duration: settings.duration * 0.6,
              },
            }
          }
          return undefined
        },
      }),
      lineY(rows, {
        id: 'target',
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: {
          delay: 80,
          transition: settings.spring
            ? {
                type: 'spring',
                stiffness: settings.stiffness * 0.78,
              }
            : {
                type: 'tween',
                duration: settings.duration * 0.82,
              },
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    maxFocusDistance: 28,
  })
}

export function readEasing(value: string): UpdateSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

export function springRegime(settings: UpdateSettings) {
  const ratio =
    settings.damping / (2 * Math.sqrt(settings.stiffness * settings.mass))
  if (ratio < 0.99) return 'underdamped'
  if (ratio > 1.01) return 'overdamped'
  return 'critical'
}

export default function MotionUpdatesExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '113-motion-updates'
  const viewRef = useRef<HTMLDivElement>(null)

  const updateRef = useRef<HTMLButtonElement>(null)

  const interruptRef = useRef<HTMLButtonElement>(null)

  const replayRef = useRef<HTMLButtonElement>(null)

  const timerRef = useRef<number>(undefined)

  const [stage, setStage] = useState(
    () => Math.abs(input.revision) % stages.length,
  )

  const [settings, setSettings] = useState(initialSettings)

  const [replayCount, setReplayCount] = useState(1)

  const [, setInterruptionCount] = useState(0)

  const [announcement, setAnnouncement] = useState('')

  const renderer = useMemo(() => motion(), [replayCount])

  const rows = stages[stage] ?? stages[0]

  const definition = useMemo(
    () => motionUpdatesDefinition(rows, settings),
    [rows, settings],
  )

  const clearTimer = () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  const rebuild = (next: Partial<UpdateSettings>) => {
    clearTimer()
    setSettings((current) => ({ ...current, ...next }))
    setReplayCount((value) => value + 1)
    setAnnouncement('')
  }

  const advance = () => {
    clearTimer()
    setStage((value) => (value + 1) % stages.length)
    setAnnouncement('')
  }

  const interrupt = () => {
    clearTimer()
    setStage(1)
    setAnnouncement('Interrupting in 400 ms')
    timerRef.current = window.setTimeout(() => {
      setStage(2)
      setInterruptionCount((value) => value + 1)
      setAnnouncement('')
      timerRef.current = undefined
    }, 400)
  }

  const replay = () => {
    clearTimer()
    setStage(0)
    setReplayCount((value) => value + 1)
    setAnnouncement('')
  }

  useEffect(() => {
    clearTimer()
    setStage(Math.abs(input.revision) % stages.length)
    setAnnouncement('')
  }, [input.revision])

  useEffect(() => () => clearTimer(), [])

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
      <ControlBar label="Keyed update motion controls">
        {settings.spring ? null : (
          <RangeField
            label="Duration"
            min={300}
            max={1_800}
            step={100}
            suffix=" ms"
            value={settings.duration}
            onChange={(duration) => rebuild({ duration })}
          />
        )}
        <ControlField label="Transition">
          <select
            value={
              settings.spring
                ? 'spring'
                : typeof settings.easing === 'string'
                  ? settings.easing
                  : 'polished'
            }
            onChange={(event) => {
              const value = event.currentTarget.value
              rebuild({
                spring: value === 'spring',
                easing: readEasing(value),
              })
            }}
          >
            <option value="polished">Tween · Polished</option>
            <option value="spring">Spring</option>
            <option value="ease">Tween · Ease</option>
            <option value="ease-out">Tween · Ease out</option>
            <option value="ease-in-out">Tween · Ease in/out</option>
            <option value="linear">Tween · Linear</option>
          </select>
        </ControlField>
        {settings.spring ? (
          <>
            <RangeField
              label="Stiffness"
              min={40}
              max={400}
              step={10}
              value={settings.stiffness}
              onChange={(stiffness) => rebuild({ stiffness })}
            />
            <RangeField
              label="Damping"
              min={0}
              max={50}
              step={1}
              value={settings.damping}
              onChange={(damping) => rebuild({ damping })}
            />
            <RangeField
              label="Mass"
              min={0.25}
              max={3}
              step={0.25}
              suffix="×"
              value={settings.mass}
              onChange={(mass) => rebuild({ mass })}
            />
            <output style={{ opacity: 0.7 }}>
              {springRegime(settings)} · momentum preserved
            </output>
          </>
        ) : null}
        <ControlButton ref={updateRef} onClick={advance}>
          Update
        </ControlButton>
        <ControlButton ref={interruptRef} onClick={interrupt}>
          Interrupt
        </ControlButton>
        <ControlButton ref={replayRef} onClick={replay}>
          Replay
        </ControlButton>
        <output aria-live="polite" style={{ opacity: 0.7 }}>
          {announcement || `Stage ${stage + 1} of ${stages.length}`}
        </output>
      </ControlBar>
      <Chart
        key={replayCount}
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={Math.max(180, input.height - (settings.spring ? 96 : 58))}
        ariaLabel="Keyed actuals and targets during interrupted updates"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
