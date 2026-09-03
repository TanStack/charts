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
import {
  clampEditableEventEnd,
  editableDateFromAnchor,
  editableDateKey,
  editableEventEndValues,
} from './model'
import { editableEvents, initialEditableEventEnd } from './scenario'
import { createDriver } from './tanstack'
import {
  cloneDate,
  editableAriaLabel,
  editableEventDefinition,
  editableSummaryText,
} from './example'
import type { ChartScene } from '@tanstack/charts'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { ConformanceTestDriver } from '../../types'
import type { EditableEvent } from './scenario'
import type { EditableState } from './example'

const validationMessage = 'Choose a release end date within the range.'

const EditableEventExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function EditableEventExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const sceneRef = useRef<ChartScene<
    EditableEvent,
    Date | number,
    string
  > | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input
  const [acceptedEnd, setAcceptedEnd] = useState(() =>
    cloneDate(initialEditableEventEnd),
  )
  const [state, setState] = useState<EditableState>(() => ({
    end: cloneDate(initialEditableEventEnd),
    editing: false,
    editCount: 0,
    originEnd: null,
  }))
  const [dateValue, setDateValue] = useState(() =>
    editableDateKey(initialEditableEventEnd),
  )
  const [invalid, setInvalid] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const commitState = useCallback((next: EditableState) => {
    stateRef.current = next
    setState(next)
  }, [])
  const beginEdit = useCallback(
    (origin = stateRef.current.end) => {
      if (stateRef.current.editing) return
      commitState({
        ...stateRef.current,
        originEnd: cloneDate(origin),
        editing: true,
      })
    },
    [commitState],
  )
  const applyEnd = useCallback(
    (next: Date) => {
      const end = clampEditableEventEnd(next)
      setAcceptedEnd(end)
      setDateValue(editableDateKey(end))
      setInvalid(false)
      commitState({ ...stateRef.current, end: cloneDate(end) })
    },
    [commitState],
  )
  const commitEdit = useCallback(() => {
    if (!stateRef.current.editing) return
    commitState({
      ...stateRef.current,
      editing: false,
      originEnd: null,
      editCount: stateRef.current.editCount + 1,
    })
  }, [commitState])
  const cancelEdit = useCallback(
    (fallback?: Date) => {
      if (!stateRef.current.editing && !fallback) return
      const origin = fallback ?? stateRef.current.originEnd
      const end = origin ? clampEditableEventEnd(origin) : stateRef.current.end
      setAcceptedEnd(end)
      setDateValue(editableDateKey(end))
      setInvalid(false)
      commitState({
        ...stateRef.current,
        end: cloneDate(end),
        editing: false,
        originEnd: null,
      })
    },
    [commitState],
  )
  const handleEndChange = useCallback(
    (next: Date, reason: HandleXChange<Date>) => {
      if (reason.type === 'preview') {
        beginEdit(reason.origin)
        applyEnd(next)
        return
      }
      if (reason.type === 'cancel') {
        cancelEdit(reason.origin)
        return
      }
      beginEdit(reason.origin)
      applyEnd(next)
      commitEdit()
    },
    [applyEnd, beginEdit, cancelEdit, commitEdit],
  )
  const definition = useMemo(
    () =>
      editableEventDefinition({ ...input, end: acceptedEnd }, handleEndChange),
    [acceptedEnd, handleEndChange, input],
  )

  useEffect(() => {
    dateRef.current?.setCustomValidity(invalid ? validationMessage : '')
  }, [invalid])
  useImperativeHandle(ref, () => {
    const view = viewRef.current
    const chart = chartRef.current
    const date = dateRef.current
    if (!view || !chart || !date) throw new Error('Missing editable event view')
    return createDriver(
      view,
      chart,
      date,
      () => {
        if (!sceneRef.current) throw new Error('Missing editable event scene')
        return sceneRef.current
      },
      () => stateRef.current,
      () => inputRef.current,
    )
  }, [])

  const handleDateInput = (event: FormEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value
    setDateValue(value)
    const next = editableDateFromAnchor(`date:${value}`)
    if (!next || clampEditableEventEnd(next).getTime() !== next.getTime()) {
      setInvalid(true)
      return
    }
    beginEdit()
    applyEnd(next)
  }
  const handleDateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !invalid) commitEdit()
    if (event.key === 'Escape') cancelEdit()
  }
  const handlePointerCancel = (_event: PointerEvent<HTMLInputElement>) => {
    cancelEdit()
  }

  const minDate = editableDateKey(editableEventEndValues[0]!)
  const maxDate = editableDateKey(editableEventEndValues.at(-1)!)
  const eventDescriptions = editableEvents(input.revision, state.end).map(
    (row) =>
      `${row.label}: ${editableDateKey(row.start)} to ${editableDateKey(row.end)}`,
  )
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
      <style>{`
        .ts-conformance-event-date:focus-visible {
          outline: 3px solid var(--ts-chart-1, #2563eb);
          outline-offset: 2px;
        }
      `}</style>
      <div ref={chartRef}>
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={input.height}
          ariaLabel={editableAriaLabel(input.revision, state.end)}
          onRender={({ scene }) => {
            sceneRef.current = scene
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          className="ts-conformance-event-toolbar"
          role="group"
          aria-label="Release event editor"
          style={{
            position: 'absolute',
            top: 4,
            left: 12,
            right: 12,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            gap: 8,
            color: 'inherit',
            pointerEvents: 'none',
          }}
        >
          <output
            className="ts-conformance-event-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              boxSizing: 'border-box',
              flex: '1 1 120px',
              minWidth: 120,
              minHeight: 44,
              padding: '8px 10px',
              border:
                '1px solid color-mix(in srgb, currentColor 32%, transparent)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              background:
                'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
              color: 'inherit',
              font: '600 12px/1.25 system-ui, sans-serif',
            }}
          >
            {editableSummaryText(state.end)}
          </output>
          <label
            style={{
              boxSizing: 'border-box',
              flex: '0 1 140px',
              minWidth: 128,
              display: 'grid',
              gap: 2,
              color: 'inherit',
              font: '600 11px/1.15 system-ui, sans-serif',
              pointerEvents: 'auto',
            }}
          >
            Release end
            <input
              ref={dateRef}
              className="ts-conformance-event-date"
              type="date"
              required
              min={minDate}
              max={maxDate}
              value={dateValue}
              aria-label="Release end date input"
              aria-invalid={invalid}
              onInput={handleDateInput}
              onBlur={() => {
                if (!invalid) commitEdit()
              }}
              onKeyDown={handleDateKeyDown}
              onPointerCancel={handlePointerCancel}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                height: 44,
                padding: '6px 8px',
                border: `1px solid ${
                  invalid
                    ? '#dc2626'
                    : 'color-mix(in srgb, currentColor 32%, transparent)'
                }`,
                borderRadius: 8,
                background:
                  'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
                color: 'inherit',
                colorScheme: 'light dark',
                font: '600 12px/1 system-ui, sans-serif',
              }}
            />
          </label>
          <span
            className="ts-conformance-event-validation"
            aria-live="polite"
            hidden={!invalid}
            style={{
              flex: '1 0 100%',
              color: '#dc2626',
              font: '600 11px/1.2 system-ui, sans-serif',
            }}
          >
            {invalid ? validationMessage : ''}
          </span>
        </div>
        <ul
          className="ts-conformance-event-identities"
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
          {eventDescriptions.map((description) => (
            <li key={description}>{description}</li>
          ))}
        </ul>
      </div>
    </div>
  )
})

export const mount = reactMount(EditableEventExample)
