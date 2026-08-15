import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { ControlBar, ControlButton, ControlField } from './controls'
import { springLineStages } from './model'
import type { SpringLineRow } from './model'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export type SpringLineTransitionMode = 'spring' | 'tween'

export function springLineMotionDefinition(
  rows: readonly SpringLineRow[],
  mode: SpringLineTransitionMode,
) {
  return defineChart({
    motion: {
      transition:
        mode === 'spring'
          ? { type: 'spring', stiffness: 170, damping: 18, mass: 1 }
          : { type: 'tween', duration: 650, easing: 'ease-out' },
    },
    marks: [
      lineY(rows, {
        id: 'primary',
        x: 'period',
        y: 'primary',
        key: 'id',
        stroke: '#7c3aed',
        strokeWidth: 4,
      }),
      lineY(rows, {
        id: 'comparison',
        x: 'period',
        y: 'comparison',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? 90 : 0,
            transition:
              mode === 'spring'
                ? { type: 'spring', mass: 1.2 }
                : {
                    type: 'tween',
                    duration: 820,
                    easing: 'ease-in-out',
                  },
          }
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 24, right: 24, bottom: 24, left: 24 },
  })
}

export default function SpringLineMotionExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '114-spring-line-motion'
  const viewRef = useRef<HTMLDivElement>(null)

  const updateRef = useRef<HTMLButtonElement>(null)

  const interruptRef = useRef<HTMLButtonElement>(null)

  const replayRef = useRef<HTMLButtonElement>(null)

  const timerRef = useRef<number>(undefined)

  const [stage, setStage] = useState(
    () => Math.abs(input.revision) % springLineStages.length,
  )

  const [mode, setMode] = useState<SpringLineTransitionMode>('spring')

  const [replayCount, setReplayCount] = useState(1)

  const [, setInterruptionCount] = useState(0)

  const [announcement, setAnnouncement] = useState('')

  const renderer = useMemo(() => motion(), [replayCount])

  const definition = useMemo(
    () =>
      springLineMotionDefinition(
        springLineStages[stage] ?? springLineStages[0],
        mode,
      ),
    [mode, stage],
  )

  const clearTimer = () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  const update = () => {
    clearTimer()
    setStage((value) => (value + 1) % springLineStages.length)
    setAnnouncement('')
  }

  const interrupt = () => {
    clearTimer()
    setStage(1)
    setAnnouncement('Reversing in 260 ms')
    timerRef.current = window.setTimeout(() => {
      setStage(2)
      setInterruptionCount((value) => value + 1)
      setAnnouncement('')
      timerRef.current = undefined
    }, 260)
  }

  const replay = () => {
    clearTimer()
    setStage(0)
    setReplayCount((value) => value + 1)
    setAnnouncement('')
  }

  useEffect(() => {
    clearTimer()
    setStage(Math.abs(input.revision) % springLineStages.length)
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
      <ControlBar label="Line motion controls">
        <ControlField label="Transition">
          <select
            value={mode}
            onChange={(event) => {
              setMode(
                event.currentTarget.value === 'tween' ? 'tween' : 'spring',
              )
              replay()
            }}
          >
            <option value="spring">Spring</option>
            <option value="tween">Tween</option>
          </select>
        </ControlField>
        <ControlButton ref={updateRef} onClick={update}>
          Update
        </ControlButton>
        <ControlButton ref={interruptRef} onClick={interrupt}>
          Interrupt
        </ControlButton>
        <ControlButton ref={replayRef} onClick={replay}>
          Replay
        </ControlButton>
        <output aria-live="polite" style={{ opacity: 0.7 }}>
          {announcement || `Stage ${stage + 1} of ${springLineStages.length}`}
        </output>
      </ControlBar>
      <Chart
        key={replayCount}
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={Math.max(180, input.height - 58)}
        ariaLabel="Primary and comparison series with spring motion"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
