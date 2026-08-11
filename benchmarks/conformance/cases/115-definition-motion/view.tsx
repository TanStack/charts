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
import { definitionMotionStages } from './model'
import { definitionMotionDefinition } from './tanstack'
import type { DefinitionMotionRow } from './model'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const DefinitionMotionExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function DefinitionMotionExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const updateRef = useRef<HTMLButtonElement>(null)
  const interruptRef = useRef<HTMLButtonElement>(null)
  const replayRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number>(undefined)
  const [stage, setStage] = useState(
    () => Math.abs(input.revision) % definitionMotionStages.length,
  )
  const [replayCount, setReplayCount] = useState(1)
  const [interruptionCount, setInterruptionCount] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const renderer = useMemo(
    () => motion<DefinitionMotionRow, string, number>(),
    [replayCount],
  )
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
          interruptionCount,
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
    [interruptionCount, stage],
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
})

export const mount = reactMount(DefinitionMotionExample)

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
