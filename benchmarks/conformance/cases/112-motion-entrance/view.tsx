import { motionEntranceDefinition } from './example'
import type { MotionSettings } from './example'
import {
  forwardRef,
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
import { tanstackCase } from '../../shared/mount'
import type { MotionRow } from './model'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const initialSettings: MotionSettings = {
  duration: 1_100,
  staggerMs: 55,
  easing: undefined,
  customTiming: true,
}

const MotionEntranceExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function MotionEntranceExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const replayRef = useRef<HTMLButtonElement>(null)
  const [settings, setSettings] = useState(initialSettings)
  const [replayCount, setReplayCount] = useState(1)
  const renderer = useMemo(
    () => motion<MotionRow, string, number>(),
    [replayCount],
  )
  const definition = useMemo(
    () => motionEntranceDefinition(settings),
    [settings],
  )
  const replay = () => setReplayCount((value) => value + 1)
  const changeSettings = (next: Partial<MotionSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    replay()
  }

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (
          (target.view && target.view !== 'main') ||
          target.anchor !== 'control:replay'
        ) {
          return null
        }
        return replayRef.current ? center(replayRef.current) : null
      },
      readState() {
        return {
          duration: settings.duration,
          staggerMs: settings.staggerMs,
          customTiming: settings.customTiming,
          replayCount,
          motionState: viewRef.current
            ? readChartMotionState(viewRef.current)
            : null,
        }
      },
      settle: () =>
        viewRef.current
          ? settleChartMotion(viewRef.current, settings.duration * 1.6)
          : Promise.resolve(),
    }),
    [replayCount, settings],
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
})

export const mount = reactMount(MotionEntranceExample)

export const catalogCase = tanstackCase(
  () => motionEntranceDefinition(initialSettings),
  'Staggered monthly actuals and target',
)

function readEasing(value: string): MotionSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
