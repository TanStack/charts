export interface PlaybackOverlayLayout {
  left: number
  right: number
  top: number
  bottom: number
  trackY: number
  playheadX: number
  frameXs: readonly number[]
}

export interface PlaybackOverlayState {
  index: number
  max: number
  playing: boolean
  valueText: string
}

export function createPlaybackOverlay(
  view: HTMLDivElement,
  onInput: (index: number) => void,
  onTogglePlayback: () => void,
) {
  const document = view.ownerDocument
  const style = document.createElement('style')
  style.textContent = `
    .ts-conformance-playback-range {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      color-scheme: light dark;
      cursor: ew-resize;
      margin: 0;
      padding: 0;
    }
    .ts-conformance-playback-range::-webkit-slider-runnable-track {
      height: 4px;
      background: transparent;
    }
    .ts-conformance-playback-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -8px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-playback-range::-moz-range-track {
      height: 4px;
      background: transparent;
    }
    .ts-conformance-playback-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-playback-range:focus-visible {
      outline: none;
    }
    .ts-conformance-playback-range:focus-visible
      + .ts-conformance-playback-handle {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 3px;
    }
    .ts-conformance-playback-toolbar {
      color: inherit;
    }
    .ts-conformance-playback-current,
    .ts-conformance-playback-button {
      border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas);
      color: inherit;
    }
    .ts-conformance-playback-button:hover {
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 20%, Canvas);
    }
    .ts-conformance-playback-button:focus-visible {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 2px;
    }
  `

  const layer = document.createElement('div')
  layer.style.position = 'absolute'
  layer.style.inset = '0'
  layer.style.zIndex = '3'
  layer.style.pointerEvents = 'none'

  const track = document.createElement('div')
  track.className = 'ts-conformance-playback-track'
  track.dataset.conformancePlaybackRule = 'track'
  track.dataset.chartHandleTrack = 'playback-frame'
  track.style.position = 'absolute'
  track.style.height = '4px'
  track.style.borderRadius = '999px'
  track.style.background = 'color-mix(in srgb, currentColor 52%, transparent)'

  const playhead = document.createElement('div')
  playhead.className = 'ts-conformance-playback-playhead'
  playhead.dataset.conformancePlaybackRule = 'playhead'
  playhead.dataset.chartHandleRule = 'playback-frame'
  playhead.style.position = 'absolute'
  playhead.style.width = '2px'
  playhead.style.borderRadius = '999px'
  playhead.style.background = 'var(--ts-chart-2, #f97316)'

  const range = document.createElement('input')
  range.className = 'ts-conformance-playback-range'
  range.type = 'range'
  range.dataset.chartHandleSurface = 'playback-frame'
  range.min = '0'
  range.step = '1'
  range.setAttribute('aria-label', 'Timeline frame')
  range.style.position = 'absolute'
  range.style.height = '44px'
  range.style.pointerEvents = 'auto'

  const handle = document.createElement('div')
  handle.className = 'ts-conformance-playback-handle'
  handle.dataset.conformancePlaybackHandle = ''
  handle.dataset.chartHandle = 'playback-frame'
  handle.style.position = 'absolute'
  handle.style.boxSizing = 'border-box'
  handle.style.width = '20px'
  handle.style.height = '20px'
  handle.style.border = '2px solid Canvas'
  handle.style.borderRadius = '999px'
  handle.style.background = 'var(--ts-chart-2, #f97316)'
  handle.style.boxShadow = '0 1px 4px rgb(15 23 42 / 0.35)'

  const toolbar = document.createElement('div')
  toolbar.className = 'ts-conformance-playback-toolbar'
  toolbar.setAttribute('role', 'group')
  toolbar.setAttribute('aria-label', 'Timeline playback controls')
  toolbar.style.position = 'absolute'
  toolbar.style.top = '4px'
  toolbar.style.left = '56px'
  toolbar.style.right = '20px'
  toolbar.style.display = 'flex'
  toolbar.style.alignItems = 'center'
  toolbar.style.justifyContent = 'flex-end'
  toolbar.style.gap = '8px'
  toolbar.style.pointerEvents = 'none'

  const current = document.createElement('div')
  current.className = 'ts-conformance-playback-current'
  current.style.boxSizing = 'border-box'
  current.style.minWidth = '0'
  current.style.minHeight = '32px'
  current.style.padding = '7px 9px'
  current.style.borderRadius = '999px'
  current.style.overflow = 'hidden'
  current.style.textOverflow = 'ellipsis'
  current.style.whiteSpace = 'nowrap'
  current.style.font = '600 12px/1.2 system-ui, sans-serif'

  const playButton = document.createElement('button')
  playButton.className = 'ts-conformance-playback-button'
  playButton.type = 'button'
  playButton.setAttribute('aria-label', 'Play timeline')
  playButton.title = 'Play timeline'
  playButton.style.flex = '0 0 auto'
  playButton.style.width = '44px'
  playButton.style.height = '44px'
  playButton.style.borderRadius = '10px'
  playButton.style.cursor = 'pointer'
  playButton.style.font = '700 16px/1 system-ui, sans-serif'
  playButton.style.pointerEvents = 'auto'

  const status = document.createElement('output')
  status.className = 'ts-conformance-playback-announcement'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  status.style.position = 'absolute'
  status.style.width = '1px'
  status.style.height = '1px'
  status.style.padding = '0'
  status.style.margin = '-1px'
  status.style.overflow = 'hidden'
  status.style.clipPath = 'inset(50%)'
  status.style.whiteSpace = 'nowrap'

  const handleInput = () => {
    onInput(Number(range.value))
  }
  range.addEventListener('input', handleInput)
  playButton.addEventListener('click', onTogglePlayback)

  toolbar.append(current, playButton)
  layer.append(track, playhead, range, handle, toolbar, status)
  view.append(style, layer)

  return {
    range,
    playButton,
    announce(message: string) {
      status.value = message
      status.textContent = message
    },
    ruleGeometry() {
      return [measureElement(track), measureElement(playhead)]
    },
    paint(layout: PlaybackOverlayLayout, state: PlaybackOverlayState) {
      track.style.left = `${layout.left}px`
      track.style.top = `${layout.trackY - 2}px`
      track.style.width = `${Math.max(0, layout.right - layout.left)}px`

      playhead.style.left = `${layout.playheadX - 1}px`
      playhead.style.top = `${layout.top}px`
      playhead.style.height = `${Math.max(0, layout.trackY - layout.top)}px`

      range.max = String(state.max)
      range.value = String(state.index)
      range.setAttribute('aria-valuetext', state.valueText)
      range.style.left = `${layout.left - 10}px`
      range.style.top = `${layout.trackY - 22}px`
      range.style.width = `${Math.max(0, layout.right - layout.left + 20)}px`

      handle.style.left = `${layout.playheadX - 10}px`
      handle.style.top = `${layout.trackY - 10}px`

      current.textContent = state.valueText
      playButton.textContent = state.playing ? '❚❚' : '▶'
      playButton.setAttribute('aria-pressed', String(state.playing))
      playButton.setAttribute(
        'aria-label',
        state.playing ? 'Pause timeline' : 'Play timeline',
      )
      playButton.title = state.playing ? 'Pause timeline' : 'Play timeline'
    },
    destroy() {
      range.removeEventListener('input', handleInput)
      playButton.removeEventListener('click', onTogglePlayback)
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
