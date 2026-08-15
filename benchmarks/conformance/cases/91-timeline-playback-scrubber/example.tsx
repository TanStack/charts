import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'

export interface PlaybackState {
  frame: Date
  dragging: boolean
  scrubCount: number
  playing: boolean
}
import { defineChart, dot, lineY } from '@tanstack/charts'
import { aapl } from '@tanstack/charts-data/aapl'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  initialPlaybackIndex,
  playbackDateKey,
  selectPlaybackRows,
} from './model'
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const linePaint = '#2563eb'

const playheadPaint = '#f97316'

const margin = { top: 64, right: 24, bottom: 68, left: 56 }

export const playbackRows = selectPlaybackRows(aapl)

const playbackDates = playbackRows.map((row) => row.Date)

export const initialFrame = playbackRows[initialPlaybackIndex]?.Date

export function playbackDefinition(
  frame: Date,
  onChange: (value: Date, reason: HandleXChange<Date>) => void,
  preview = false,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(playbackRows, {
          id: 'playback-line',
          x: 'Date',
          y: 'Close',
          stroke: linePaint,
          strokeWidth: 2.5,
        }),
      ),
      dot(playbackRows, {
        id: 'playback-points',
        x: 'Date',
        y: 'Close',
        fill: linePaint,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: {
        ticks: {
          format: (value) =>
            value.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
        },
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    controls: [
      handleX({
        id: 'playback-frame',
        value: controlledSignal<Date, HandleXChange<Date>>(
          frame,
          (next, { reason }) => onChange(next, reason),
        ),
        values: playbackDates,
        cross: { edge: 'bottom', offset: preview ? -18 : 34 },
        trackStyle: {
          fill: 'color-mix(in srgb, currentColor 52%, transparent)',
        },
        ruleStyle: { fill: playheadPaint },
        handleStyle: {
          fill: playheadPaint,
          stroke: 'Canvas',
          strokeWidth: 2,
        },
        hitSize: 44,
        ariaLabel: 'Timeline frame',
        format: (value) => playbackValueText(rowForDate(value)),
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: preview ? 0 : margin,
  })
}

export function rowForDate(date: Date) {
  const row = playbackRows.find(
    (candidate) => candidate.Date.getTime() === date.getTime(),
  )
  if (!row) throw new Error('Playback frame must be an observed date.')
  return row
}

export function indexForDate(date: Date) {
  const index = playbackRows.findIndex(
    (row) => row.Date.getTime() === date.getTime(),
  )
  if (index < 0) throw new Error('Playback frame must be an observed date.')
  return index
}

export function playbackValueText(row: AaplRow) {
  return `${playbackDateKey(row.Date)} · AAPL close $${row.Close.toFixed(2)}`
}

export function cloneDate(date: Date) {
  return new Date(date.getTime())
}

export default function PlaybackExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '91-timeline-playback-scrubber'
  const viewRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<HTMLDivElement>(null)

  const playRef = useRef<HTMLButtonElement>(null)

  const sceneRef = useRef<ChartScene<AaplRow, Date, number>>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const [accepted, setAccepted] = useState(() => cloneDate(initialFrame))

  const [state, setState] = useState<PlaybackState>(() => ({
    frame: cloneDate(initialFrame),
    dragging: false,
    scrubCount: 0,
    playing: false,
  }))

  const [announcement, setAnnouncement] = useState('')

  const stateRef = useRef(state)

  stateRef.current = state

  const commitState = useCallback((next: PlaybackState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const frameText = useCallback(
    (frame = stateRef.current.frame) => playbackValueText(rowForDate(frame)),
    [],
  )

  const stopPlayback = useCallback(
    (message?: string) => {
      if (timerRef.current !== undefined) clearInterval(timerRef.current)
      timerRef.current = undefined
      commitState({ ...stateRef.current, playing: false })
      if (message) setAnnouncement(`${message}. ${frameText()}`)
    },
    [commitState, frameText],
  )

  const applyFrame = useCallback(
    (next: Date) => {
      const frame = cloneDate(next)
      setAccepted(frame)
      commitState({ ...stateRef.current, frame })
    },
    [commitState],
  )

  const handleFrameChange = useCallback(
    (next: Date, reason: HandleXChange<Date>) => {
      if (stateRef.current.playing) stopPlayback()
      if (reason.type === 'preview') {
        commitState({
          ...stateRef.current,
          frame: cloneDate(next),
          dragging: true,
        })
        return
      }
      if (reason.type === 'cancel') {
        const frame = cloneDate(reason.origin)
        commitState({ ...stateRef.current, frame, dragging: false })
        setAnnouncement(`Scrub canceled. ${frameText(frame)}`)
        return
      }
      const frame = cloneDate(next)
      setAccepted(frame)
      commitState({
        ...stateRef.current,
        frame,
        dragging: false,
        scrubCount: stateRef.current.scrubCount + 1,
      })
      setAnnouncement(`Frame selected. ${frameText(frame)}`)
    },
    [commitState, frameText, stopPlayback],
  )

  const definition = useMemo(
    () => playbackDefinition(accepted, handleFrameChange),
    [accepted, handleFrameChange],
  )

  const togglePlayback = useCallback(() => {
    if (stateRef.current.playing) {
      stopPlayback('Playback paused')
      return
    }
    const lastIndex = playbackRows.length - 1
    const restarting = indexForDate(stateRef.current.frame) >= lastIndex
    if (restarting) applyFrame(playbackRows[0]!.Date)
    commitState({ ...stateRef.current, playing: true, dragging: false })
    timerRef.current = setInterval(() => {
      const index = indexForDate(stateRef.current.frame)
      if (index >= playbackRows.length - 1) {
        stopPlayback('Playback ended')
        return
      }
      applyFrame(playbackRows[index + 1]!.Date)
    }, 700)
    setAnnouncement(
      `${restarting ? 'Playback restarted' : 'Playback started'}. ${frameText()}`,
    )
  }, [applyFrame, commitState, frameText, stopPlayback])

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearInterval(timerRef.current)
    },
    [],
  )

  const buttonLabel = state.playing ? 'Pause timeline' : 'Play timeline'

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      style={{
        position: 'relative',
        width: input.width,
        height: input.height,
        touchAction: 'pan-y',
      }}
    >
      <div ref={chartRef}>
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={input.height}
          ariaLabel="AAPL closes with a draggable timeline playback scrubber"
          onRender={({ scene }) => {
            sceneRef.current = scene
          }}
        />
      </div>
      <div
        className="ts-conformance-playback-toolbar"
        role="group"
        aria-label="Timeline playback controls"
        style={{
          position: 'absolute',
          top: 4,
          left: 56,
          right: 20,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          className="ts-conformance-playback-current"
          style={{
            boxSizing: 'border-box',
            minWidth: 0,
            minHeight: 32,
            padding: '7px 9px',
            border:
              '1px solid color-mix(in srgb, currentColor 32%, transparent)',
            borderRadius: 999,
            overflow: 'hidden',
            background:
              'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
            color: 'inherit',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            font: '600 12px/1.2 system-ui, sans-serif',
          }}
        >
          {frameText(state.frame)}
        </div>
        <button
          ref={playRef}
          className="ts-conformance-playback-button"
          type="button"
          aria-pressed={state.playing}
          aria-label={buttonLabel}
          title={buttonLabel}
          onClick={togglePlayback}
          style={{
            flex: '0 0 auto',
            width: 44,
            height: 44,
            border:
              '1px solid color-mix(in srgb, currentColor 32%, transparent)',
            borderRadius: 10,
            background:
              'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
            color: 'inherit',
            cursor: 'pointer',
            font: '700 16px/1 system-ui, sans-serif',
            pointerEvents: 'auto',
          }}
        >
          {state.playing ? '❚❚' : '▶'}
        </button>
      </div>
      <output
        className="ts-conformance-playback-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement}
      </output>
    </div>
  )
}
