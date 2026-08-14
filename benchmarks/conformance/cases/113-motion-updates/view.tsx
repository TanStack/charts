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
  RangeField,
} from '../../shared/react-controls'
import { reactMount } from '../../shared/react-mount'
import { motionUpdatesDefinition, readEasing, springRegime } from './example'
import { updateStages as stages } from './model'
import type { UpdateRow } from './model'
import type { UpdateSettings } from './example'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const initialSettings: UpdateSettings = {
  duration: 1_100,
  easing: undefined,
  spring: false,
  stiffness: 170,
  damping: 14,
  mass: 1,
}

const MotionUpdatesExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function MotionUpdatesExample({ input, idPrefix }, ref) {
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
  const [interruptionCount, setInterruptionCount] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const renderer = useMemo(
    () => motion<UpdateRow, string, number>(),
    [replayCount],
  )
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
          ids: rows.map((row) => row.id),
          motionState: viewRef.current
            ? readChartMotionState(viewRef.current)
            : null,
        }
      },
      settle: () =>
        viewRef.current
          ? settleChartMotion(
              viewRef.current,
              settings.spring ? 5_000 : settings.duration * 1.6,
            )
          : Promise.resolve(),
    }),
    [interruptionCount, rows, settings, stage],
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
})

export const mount = reactMount(MotionUpdatesExample)

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
