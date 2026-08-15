import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { ControlBar, ControlButton } from './controls'
import { definitionMotionStages } from './model'
import type { DefinitionMotionRow } from './model'
import { barY, defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export function definitionMotionDefinition(
  rows: readonly DefinitionMotionRow[],
  preview = false,
) {
  const maximum = Math.max(100, ...rows.map((row) => row.actual))
  const yMaximum = Math.ceil(maximum / 20) * 20
  const guideMotion = {
    transition: {
      type: 'tween' as const,
      duration: 260,
      easing: 'ease-out' as const,
    },
  }
  return defineChart({
    motion: {
      transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
    },
    marks: [
      barY(rows, {
        id: 'actual',
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 6,
        inset: 5,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? context.datumIndex * 34 : 0,
            transition: context.datum?.featured
              ? { type: 'spring', mass: 1.45 }
              : undefined,
          }
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
          transition: {
            type: 'tween',
            duration: 520,
            easing: 'ease-in-out',
          },
        },
      }),
    ],
    x: {
      scale: scaleBand().domain(rows.map((row) => row.period)),
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: {
          motion(context) {
            return {
              delay: context.datumIndex * 18,
              transition: { type: 'tween', duration: 220 },
            }
          },
        },
        label: { text: 'Period', motion: guideMotion },
      },
    },
    y: {
      scale: scaleLinear().domain([0, yMaximum]),
      grid: true,
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: { motion: guideMotion },
        label: { text: 'Value', motion: guideMotion },
      },
    },
    margin: preview
      ? { top: 12, right: 4, bottom: 40, left: 46 }
      : { top: 20, right: 24 },
    maxFocusDistance: 32,
  })
}

export default function DefinitionMotionExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '115-definition-motion'
  const viewRef = useRef<HTMLDivElement>(null)

  const updateRef = useRef<HTMLButtonElement>(null)

  const interruptRef = useRef<HTMLButtonElement>(null)

  const replayRef = useRef<HTMLButtonElement>(null)

  const timerRef = useRef<number>(undefined)

  const [stage, setStage] = useState(
    () => Math.abs(input.revision) % definitionMotionStages.length,
  )

  const [replayCount, setReplayCount] = useState(1)

  const [, setInterruptionCount] = useState(0)

  const [announcement, setAnnouncement] = useState('')

  const renderer = useMemo(() => motion(), [replayCount])

  const definition = useMemo(
    () =>
      definitionMotionDefinition(
        definitionMotionStages[stage] ?? definitionMotionStages[0],
      ),
    [stage],
  )

  const clearTimer = () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  const advance = () => {
    clearTimer()
    setStage((value) => (value + 1) % definitionMotionStages.length)
    setAnnouncement('')
  }

  const interrupt = () => {
    clearTimer()
    setStage(1)
    setAnnouncement('Retargeting in 220 ms')
    timerRef.current = window.setTimeout(() => {
      setStage(2)
      setInterruptionCount((value) => value + 1)
      setAnnouncement('')
      timerRef.current = undefined
    }, 220)
  }

  const replay = () => {
    clearTimer()
    setStage(0)
    setReplayCount((value) => value + 1)
    setAnnouncement('')
  }

  useEffect(() => {
    clearTimer()
    setStage(Math.abs(input.revision) % definitionMotionStages.length)
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
      <ControlBar label="Definition motion controls">
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
          {announcement ||
            `Stage ${stage + 1} of ${definitionMotionStages.length}`}
        </output>
      </ControlBar>
      <Chart
        key={replayCount}
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={Math.max(220, input.height - 58)}
        ariaLabel="Definition-owned chart, mark, datum, and guide motion"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
