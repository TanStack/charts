import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import { ControlBar, ControlButton } from '../../shared/react-controls'
import { reactMount } from '../../shared/react-mount'
import { morphData, morphModes } from './model'
import { geometryMorphDefinition, modeForRevision, modeLabel } from './tanstack'
import type { MorphDatum, MorphMode } from './model'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const GeometryMorphExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function GeometryMorphExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const interruptRef = useRef<HTMLButtonElement>(null)
  const replayRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number>(undefined)
  const [mode, setMode] = useState<MorphMode>(() =>
    modeForRevision(input.revision),
  )
  const [replayCount, setReplayCount] = useState(1)
  const [interruptionCount, setInterruptionCount] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const renderer = useMemo(
    () => motion<MorphDatum, number, number>(),
    [replayCount],
  )
  const definition = useMemo(
    () => geometryMorphDefinition(morphData, mode),
    [mode],
  )
  const clearTimer = () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }
  const selectMode = (nextMode: MorphMode) => {
    clearTimer()
    setMode(nextMode)
    setAnnouncement('')
  }
  const advance = () => {
    const index = morphModes.indexOf(mode)
    selectMode(morphModes[(index + 1) % morphModes.length] ?? 'bars')
  }
  const interrupt = () => {
    clearTimer()
    setMode('rose')
    setAnnouncement('Rose → bubbles in 180 ms')
    timerRef.current = window.setTimeout(() => {
      setMode('bubbles')
      setInterruptionCount((value) => value + 1)
      setAnnouncement('')
      timerRef.current = undefined
    }, 180)
  }
  const replay = () => {
    clearTimer()
    setMode('bars')
    setReplayCount((value) => value + 1)
    setAnnouncement('')
  }

  useEffect(() => {
    clearTimer()
    setMode(modeForRevision(input.revision))
    setAnnouncement('')
  }, [input.revision])
  useEffect(() => () => clearTimer(), [])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.view && target.view !== 'main') return null
        const control =
          target.anchor === 'control:update'
            ? nextRef.current
            : target.anchor === 'control:interrupt'
              ? interruptRef.current
              : target.anchor === 'control:replay'
                ? replayRef.current
                : null
        return control ? center(control) : null
      },
      readState() {
        return {
          mode,
          interruptionCount,
          pathCount:
            viewRef.current?.querySelectorAll(
              'g.ts-chart__geometry-morph > path',
            ).length ?? 0,
          motionState: viewRef.current
            ? readChartMotionState(viewRef.current)
            : null,
        }
      },
      settle: () =>
        viewRef.current
          ? settleChartMotion(viewRef.current, 5_000)
          : Promise.resolve(),
    }),
    [interruptionCount, mode],
  )

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
      <ControlBar label="Geometry morph controls">
        {morphModes.map((candidate) => (
          <ControlButton
            key={candidate}
            style={{ padding: '0 12px' }}
            onClick={() => selectMode(candidate)}
          >
            {modeLabel(candidate)}
          </ControlButton>
        ))}
        <ControlButton ref={nextRef} onClick={advance}>
          Next
        </ControlButton>
        <ControlButton ref={interruptRef} onClick={interrupt}>
          Interrupt
        </ControlButton>
        <ControlButton ref={replayRef} onClick={replay}>
          Replay
        </ControlButton>
        <output
          aria-live="polite"
          style={{
            display: 'inline-block',
            width: 150,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            opacity: 0.7,
          }}
        >
          {announcement || modeLabel(mode)}
        </output>
      </ControlBar>
      <Chart
        key={replayCount}
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={Math.max(220, input.height - 96)}
        ariaLabel={`Data morphing as ${mode}`}
        style={{ minHeight: 0 }}
      />
    </div>
  )
})

export const mount = reactMount(GeometryMorphExample)

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
