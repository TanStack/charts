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
import {
  ControlBar,
  ControlButton,
  ControlField,
} from '../../shared/react-controls'
import { reactMount } from '../../shared/react-mount'
import { springLineStages } from './model'
import { springLineMotionDefinition } from './tanstack'
import type { SpringLineRow } from './model'
import type { SpringLineTransitionMode } from './tanstack'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const SpringLineMotionExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function SpringLineMotionExample({ input, idPrefix }, ref) {
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
  const [interruptionCount, setInterruptionCount] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const renderer = useMemo(
    () => motion<SpringLineRow, string, number>(),
    [replayCount],
  )
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

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.view && target.view !== 'main') return null
        const control =
          target.anchor === 'control:update'
            ? updateRef.current
            : target.anchor === 'control:interrupt'
              ? interruptRef.current
              : target.anchor === 'control:replay'
                ? replayRef.current
                : null
        return control ? center(control) : null
      },
      readState() {
        return {
          stage,
          mode,
          interruptionCount,
          motionState: viewRef.current
            ? readChartMotionState(viewRef.current)
            : null,
        }
      },
      settle: () =>
        viewRef.current
          ? settleChartMotion(
              viewRef.current,
              mode === 'spring' ? 5_000 : 1_500,
            )
          : Promise.resolve(),
    }),
    [interruptionCount, mode, stage],
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
})

export const mount = reactMount(SpringLineMotionExample)

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
