export interface EditableControlsState {
  date: string
  minDate: string
  maxDate: string
  summaryText: string
  eventDescriptions: readonly string[]
}

export interface EditableControlsOptions {
  onDateInput: (value: string) => boolean
  onDateCommit: () => void
  onDateCancel: () => void
}

export function createEditableControls(
  view: HTMLDivElement,
  options: EditableControlsOptions,
) {
  const document = view.ownerDocument
  const style = document.createElement('style')
  style.textContent = `
    .ts-conformance-event-date:focus-visible {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 2px;
    }
    .ts-conformance-event-summary,
    .ts-conformance-event-date {
      border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas);
      color: inherit;
    }
    .ts-conformance-event-date {
      color-scheme: light dark;
    }
    .ts-conformance-event-date[aria-invalid="true"] {
      border-color: #dc2626;
    }
  `

  const layer = document.createElement('div')
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '3',
    pointerEvents: 'none',
  })

  const toolbar = document.createElement('div')
  toolbar.className = 'ts-conformance-event-toolbar'
  toolbar.setAttribute('role', 'group')
  toolbar.setAttribute('aria-label', 'Release event editor')
  Object.assign(toolbar.style, {
    position: 'absolute',
    top: '4px',
    left: '12px',
    right: '12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: '8px',
    color: 'inherit',
    pointerEvents: 'none',
  })

  const status = document.createElement('output')
  status.className = 'ts-conformance-event-summary'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  Object.assign(status.style, {
    boxSizing: 'border-box',
    flex: '1 1 120px',
    minWidth: '120px',
    minHeight: '44px',
    padding: '8px 10px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    font: '600 12px/1.25 system-ui, sans-serif',
  })

  const dateLabel = document.createElement('label')
  Object.assign(dateLabel.style, {
    boxSizing: 'border-box',
    flex: '0 1 140px',
    minWidth: '128px',
    display: 'grid',
    gap: '2px',
    color: 'inherit',
    font: '600 11px/1.15 system-ui, sans-serif',
    pointerEvents: 'auto',
  })
  dateLabel.append('Release end')

  const dateInput = document.createElement('input')
  dateInput.className = 'ts-conformance-event-date'
  dateInput.type = 'date'
  dateInput.required = true
  dateInput.setAttribute('aria-label', 'Release end date input')
  dateInput.setAttribute('aria-invalid', 'false')
  Object.assign(dateInput.style, {
    boxSizing: 'border-box',
    width: '100%',
    height: '44px',
    padding: '6px 8px',
    borderRadius: '8px',
    font: '600 12px/1 system-ui, sans-serif',
  })
  dateLabel.append(dateInput)

  const validation = document.createElement('span')
  validation.className = 'ts-conformance-event-validation'
  validation.setAttribute('aria-live', 'polite')
  validation.hidden = true
  Object.assign(validation.style, {
    flex: '1 0 100%',
    color: '#dc2626',
    font: '600 11px/1.2 system-ui, sans-serif',
  })

  const eventList = document.createElement('ul')
  eventList.className = 'ts-conformance-event-identities'
  Object.assign(eventList.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  })

  const setDateValidity = (valid: boolean) => {
    const message = valid ? '' : 'Choose a release end date within the range.'
    dateInput.setAttribute('aria-invalid', String(!valid))
    dateInput.setCustomValidity(message)
    validation.hidden = valid
    validation.textContent = message
  }
  const handleDateInput = () => {
    setDateValidity(options.onDateInput(dateInput.value))
  }
  const handleDateCommit = () => {
    if (dateInput.getAttribute('aria-invalid') !== 'true') {
      options.onDateCommit()
    }
  }
  const handleDateCancel = () => options.onDateCancel()
  dateInput.addEventListener('input', handleDateInput)
  dateInput.addEventListener('change', handleDateCommit)
  dateInput.addEventListener('pointercancel', handleDateCancel)

  toolbar.append(status, dateLabel, validation)
  layer.append(toolbar, eventList)
  view.append(style, layer)

  return {
    dateInput,
    paint(state: EditableControlsState) {
      dateInput.min = state.minDate
      dateInput.max = state.maxDate
      if (
        document.activeElement !== dateInput ||
        dateInput.getAttribute('aria-invalid') !== 'true'
      ) {
        dateInput.value = state.date
        setDateValidity(true)
      }

      status.value = state.summaryText
      status.textContent = state.summaryText
      eventList.replaceChildren(
        ...state.eventDescriptions.map((description) => {
          const item = document.createElement('li')
          item.textContent = description
          return item
        }),
      )
    },
    destroy() {
      dateInput.removeEventListener('input', handleDateInput)
      dateInput.removeEventListener('change', handleDateCommit)
      dateInput.removeEventListener('pointercancel', handleDateCancel)
      style.remove()
      layer.remove()
    },
  }
}
