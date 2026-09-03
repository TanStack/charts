import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { reactMount } from '../../shared/react-mount'
import { createDriver } from './tanstack'
import {
  cloneDate,
  indexForDate,
  initialFrame,
  playbackDefinition,
  playbackRows,
  playbackValueText,
  rowForDate,
} from './example'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { ConformanceTestDriver } from '../../types'
import type { PlaybackState } from './example'

const PlaybackExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function PlaybackExample({ input, idPrefix }, ref) {
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
  useImperativeHandle(ref, () => {
    const view = viewRef.current
    const chart = chartRef.current
    const play = playRef.current
    if (!view || !chart || !play) throw new Error('Missing playback view')
    return createDriver(
      view,
      chart,
      play,
      () => {
        if (!sceneRef.current) throw new Error('Missing playback scene')
        return sceneRef.current
      },
      () => stateRef.current,
    )
  }, [])

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
})

export const mount = reactMount(PlaybackExample)
