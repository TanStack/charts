import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chart } from '@tanstack/charts/react'
import {
  clampEditableEventEnd,
  editableDateFromAnchor,
  editableDateKey,
  editableEventEndValues,
} from './model'
import { editableEvents, initialEditableEventEnd } from './scenario'
import type { ChartScene } from '@tanstack/charts'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react'
import type { EditableEvent } from './scenario'

export interface EditableState {
  end: Date
  editing: boolean
  editCount: number
  originEnd: Date | null
}
import { defineChart, rect, text } from '@tanstack/charts'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { scaleBand, scaleUtc } from 'd3-scale'
import { editableEventColor } from './colors'
import { editableDurationDays } from './model'
import { editableDomain, editableEventStart, editableLanes } from './scenario'
const validationMessage = 'Choose a release end date within the range.'

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export interface EditableChartInput extends ExampleChartInput {
  end: Date
}

const margin = { top: 96, right: 26, bottom: 48, left: 82 }

const handleId = 'release-end'

export function editableEventDefinition(
  input: EditableChartInput,
  onEndChange: (value: Date, reason: HandleXChange<Date>) => void,
) {
  const rows = editableEvents(input.revision, input.end)
  const outsideLabels = rows
    .filter((row) => row.id !== 'release')
    .map((row) => ({ ...row, labelDate: row.end }))

  return defineChart(({ width }) => {
    const releaseLabels = rows
      .filter(
        (row) =>
          row.id === 'release' && eventBarCanFitLabel(row, width, 'Release'),
      )
      .map((row) => ({
        ...row,
        labelDate: row.start,
        shortLabel: 'Release',
      }))
    return {
      marks: [
        rect(rows, {
          id: 'event-ranges',
          x1: 'start',
          x2: 'end',
          y: 'lane',
          color: 'id',
          radius: 5,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        ...(input.preview === true
          ? []
          : [
              text(outsideLabels, {
                id: 'event-labels',
                x: 'labelDate',
                y: 'lane',
                text: 'label',
                anchor: 'start',
                dx: 5,
                fill: 'currentColor',
                fontSize: 10,
                fontWeight: 600,
              }),
              text(releaseLabels, {
                id: 'release-label',
                x: 'labelDate',
                y: 'lane',
                text: 'shortLabel',
                anchor: 'start',
                dx: 5,
                fill: '#431407',
                fontSize: 10,
                fontWeight: 700,
              }),
            ]),
      ],
      x: {
        scale: scaleUtc().domain(editableDomain),
        grid: true,
        axis: {
          ticks: {
            format: (value: Date) =>
              value.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }),
          },
        },
      },
      y: {
        scale: scaleBand<string>()
          .domain(editableLanes)
          .paddingInner(0.38)
          .paddingOuter(0.19),
        grid: false,
      },
      color: {
        domain: ['discovery', 'design', 'campaign', 'release'],
        range: [
          editableEventColor('discovery'),
          editableEventColor('design'),
          editableEventColor('campaign'),
          editableEventColor('release'),
        ],
      },
      controls: [
        handleX<Date, string>({
          id: handleId,
          value: controlledSignal<Date, HandleXChange<Date>>(
            input.end,
            (next, { reason }) => onEndChange(next, reason),
          ),
          values: editableEventEndValues,
          cross: { value: 'Engineering' },
          trackStyle: {
            fill: 'color-mix(in srgb, var(--ts-chart-2, #f97316) 58%, transparent)',
          },
          ruleStyle: false,
          handleStyle: {
            fill: 'var(--ts-chart-2, #f97316)',
            stroke: 'Canvas',
            strokeWidth: 2,
          },
          hitSize: 44,
          ariaLabel: 'Release end handle',
          format: (value) => editableHandleValueText(value),
        }),
      ],
      svgAnimation: false,
      keyboard: false,
      focusRing: false,
      margin,
    }
  })
}

function editableHandleValueText(end: Date) {
  return `Release: ${editableDateKey(editableEventStart)} → ${editableDateKey(end)} · ${editableDurationDays(editableEventStart, end)} days`
}

export function editableSummaryText(end: Date) {
  return `Release · ${compactDate(editableEventStart)} → ${compactDate(end)} · ${editableDurationDays(editableEventStart, end)} days`
}

function compactDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function editableAriaLabel(revision: number, end: Date) {
  return `Editable schedule. ${editableEvents(revision, end)
    .map(
      (row) =>
        `${row.label}, ${editableDateKey(row.start)} to ${editableDateKey(row.end)}`,
    )
    .join('. ')}.`
}

function eventBarCanFitLabel(
  event: EditableEvent,
  width: number,
  label: string,
) {
  const plotWidth = Math.max(0, width - margin.left - margin.right)
  const domainWidth = editableDomain[1].getTime() - editableDomain[0].getTime()
  const eventWidth = event.end.getTime() - event.start.getTime()
  const barWidth = domainWidth > 0 ? (eventWidth / domainWidth) * plotWidth : 0
  return barWidth >= label.length * 6 + 10
}

export function cloneDate(date: Date) {
  return new Date(date.getTime())
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export default function EditableEventExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '92-editable-event-range'
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
}
