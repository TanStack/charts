export interface EditableHandleLayout {
  x: number
  y: number
  minX: number
  maxX: number
}

export interface EditableHandleState {
  value: number
  min: number
  max: number
  date: string
  minDate: string
  maxDate: string
  valueText: string
  summaryText: string
  eventDescriptions: readonly string[]
}

export function createEditableHandleOverlay(
  view: HTMLDivElement,
  onRangeInput: (value: number) => void,
  onDateInput: (value: string) => boolean,
) {
  const document = view.ownerDocument
  const style = document.createElement('style')
  style.textContent = `
    .ts-conformance-event-range {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      color-scheme: light dark;
      cursor: ew-resize;
      margin: 0;
      padding: 0;
    }
    .ts-conformance-event-range::-webkit-slider-runnable-track {
      height: 2px;
      background: transparent;
    }
    .ts-conformance-event-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -9px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-event-range::-moz-range-track {
      height: 2px;
      background: transparent;
    }
    .ts-conformance-event-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-event-range:focus-visible {
      outline: none;
    }
    .ts-conformance-event-range:focus-visible
      + .ts-conformance-event-handle {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 3px;
    }
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
  layer.style.position = 'absolute'
  layer.style.inset = '0'
  layer.style.zIndex = '3'
  layer.style.pointerEvents = 'none'

  const track = document.createElement('div')
  track.className = 'ts-conformance-event-track'
  track.dataset.chartHandleTrack = 'release-end'
  track.style.position = 'absolute'
  track.style.height = '4px'
  track.style.borderRadius = '999px'
  track.style.background =
    'color-mix(in srgb, var(--ts-chart-2, #f97316) 58%, transparent)'

  const range = document.createElement('input')
  range.className = 'ts-conformance-event-range'
  range.type = 'range'
  range.dataset.chartHandleSurface = 'release-end'
  range.step = '1'
  range.setAttribute('aria-label', 'Release end handle')
  range.style.position = 'absolute'
  range.style.height = '44px'
  range.style.pointerEvents = 'auto'

  const handle = document.createElement('div')
  handle.className = 'ts-conformance-event-handle'
  handle.dataset.chartHandle = 'release-end'
  handle.style.position = 'absolute'
  handle.style.boxSizing = 'border-box'
  handle.style.width = '20px'
  handle.style.height = '20px'
  handle.style.border = '2px solid Canvas'
  handle.style.borderRadius = '999px'
  handle.style.background = 'var(--ts-chart-2, #f97316)'
  handle.style.boxShadow = '0 1px 4px rgb(15 23 42 / 0.35)'

  const toolbar = document.createElement('div')
  toolbar.className = 'ts-conformance-event-toolbar'
  toolbar.setAttribute('role', 'group')
  toolbar.setAttribute('aria-label', 'Release event editor')
  toolbar.style.position = 'absolute'
  toolbar.style.top = '4px'
  toolbar.style.left = '12px'
  toolbar.style.right = '12px'
  toolbar.style.display = 'flex'
  toolbar.style.flexWrap = 'wrap'
  toolbar.style.alignItems = 'flex-end'
  toolbar.style.justifyContent = 'flex-end'
  toolbar.style.gap = '8px'
  toolbar.style.color = 'inherit'
  toolbar.style.pointerEvents = 'none'

  const status = document.createElement('output')
  status.className = 'ts-conformance-event-summary'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  status.style.boxSizing = 'border-box'
  status.style.flex = '1 1 120px'
  status.style.minWidth = '120px'
  status.style.minHeight = '44px'
  status.style.padding = '8px 10px'
  status.style.borderRadius = '10px'
  status.style.display = 'flex'
  status.style.alignItems = 'center'
  status.style.font = '600 12px/1.25 system-ui, sans-serif'

  const dateLabel = document.createElement('label')
  dateLabel.style.boxSizing = 'border-box'
  dateLabel.style.flex = '0 1 140px'
  dateLabel.style.minWidth = '128px'
  dateLabel.style.display = 'grid'
  dateLabel.style.gap = '2px'
  dateLabel.style.color = 'inherit'
  dateLabel.style.font = '600 11px/1.15 system-ui, sans-serif'
  dateLabel.style.pointerEvents = 'auto'
  dateLabel.append('Release end')

  const dateInput = document.createElement('input')
  dateInput.className = 'ts-conformance-event-date'
  dateInput.type = 'date'
  dateInput.required = true
  dateInput.setAttribute('aria-label', 'Release end date input')
  dateInput.setAttribute('aria-invalid', 'false')
  dateInput.style.boxSizing = 'border-box'
  dateInput.style.width = '100%'
  dateInput.style.height = '44px'
  dateInput.style.padding = '6px 8px'
  dateInput.style.borderRadius = '8px'
  dateInput.style.font = '600 12px/1 system-ui, sans-serif'
  dateLabel.append(dateInput)

  const validation = document.createElement('span')
  validation.className = 'ts-conformance-event-validation'
  validation.setAttribute('aria-live', 'polite')
  validation.hidden = true
  validation.style.flex = '1 0 100%'
  validation.style.color = '#dc2626'
  validation.style.font = '600 11px/1.2 system-ui, sans-serif'

  const eventList = document.createElement('ul')
  eventList.className = 'ts-conformance-event-identities'
  eventList.style.position = 'absolute'
  eventList.style.width = '1px'
  eventList.style.height = '1px'
  eventList.style.padding = '0'
  eventList.style.margin = '-1px'
  eventList.style.overflow = 'hidden'
  eventList.style.clipPath = 'inset(50%)'
  eventList.style.whiteSpace = 'nowrap'

  const setDateValidity = (valid: boolean) => {
    const message = valid ? '' : 'Choose a release end date within the range.'
    dateInput.setAttribute('aria-invalid', String(!valid))
    dateInput.setCustomValidity(message)
    validation.hidden = valid
    validation.textContent = message
  }
  const handleRangeInput = () => {
    setDateValidity(true)
    onRangeInput(Number(range.value))
  }
  const handleDateInput = () => {
    setDateValidity(onDateInput(dateInput.value))
  }
  range.addEventListener('input', handleRangeInput)
  dateInput.addEventListener('input', handleDateInput)

  toolbar.append(status, dateLabel, validation)
  layer.append(track, range, handle, toolbar, eventList)
  view.append(style, layer)

  return {
    range,
    dateInput,
    handleGeometry() {
      return measureElement(handle)
    },
    trackGeometry() {
      return measureElement(track)
    },
    paint(layout: EditableHandleLayout, state: EditableHandleState) {
      track.style.left = `${layout.minX}px`
      track.style.top = `${layout.y - 2}px`
      track.style.width = `${Math.max(0, layout.maxX - layout.minX)}px`

      range.min = String(state.min)
      range.max = String(state.max)
      range.value = String(state.value)
      range.setAttribute('aria-valuetext', state.valueText)
      range.style.left = `${layout.minX - 10}px`
      range.style.top = `${layout.y - 22}px`
      range.style.width = `${Math.max(0, layout.maxX - layout.minX + 20)}px`

      handle.style.left = `${layout.x - 10}px`
      handle.style.top = `${layout.y - 10}px`

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
      range.removeEventListener('input', handleRangeInput)
      dateInput.removeEventListener('input', handleDateInput)
      style.remove()
      layer.remove()
    },
  }
}

function measureElement(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
    paint: getComputedStyle(element).backgroundColor,
  }
}
