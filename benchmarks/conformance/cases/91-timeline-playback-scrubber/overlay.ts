export interface PlaybackOverlayLayout {
  left: number
  right: number
  top: number
  bottom: number
  trackY: number
  playheadX: number
  frameXs: readonly number[]
}

export function createPlaybackOverlay(view: HTMLDivElement) {
  const document = view.ownerDocument
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.position = 'absolute'
  layer.style.inset = '0'
  layer.style.zIndex = '3'
  layer.style.pointerEvents = 'none'

  const track = document.createElement('div')
  track.style.position = 'absolute'
  track.style.height = '2px'
  track.style.borderRadius = '999px'
  track.style.background = '#cbd5e1'

  const playhead = document.createElement('div')
  playhead.style.position = 'absolute'
  playhead.style.width = '2px'
  playhead.style.borderRadius = '999px'
  playhead.style.background = '#f97316'

  const handle = document.createElement('div')
  handle.style.position = 'absolute'
  handle.style.width = '14px'
  handle.style.height = '14px'
  handle.style.border = '2px solid #ffffff'
  handle.style.borderRadius = '999px'
  handle.style.background = '#f97316'
  handle.style.boxShadow = '0 1px 4px rgb(15 23 42 / 0.3)'

  const status = document.createElement('div')
  status.style.position = 'absolute'
  status.style.right = '24px'
  status.style.top = '8px'
  status.style.padding = '3px 7px'
  status.style.border = '1px solid #fed7aa'
  status.style.borderRadius = '999px'
  status.style.background = '#fff7ed'
  status.style.color = '#9a3412'
  status.style.font = '600 11px/1.2 system-ui, sans-serif'

  layer.append(track, playhead, handle, status)
  view.append(layer)

  return {
    paint(layout: PlaybackOverlayLayout, label: string) {
      track.style.left = `${layout.left}px`
      track.style.top = `${layout.trackY - 1}px`
      track.style.width = `${Math.max(0, layout.right - layout.left)}px`

      playhead.style.left = `${layout.playheadX - 1}px`
      playhead.style.top = `${layout.top}px`
      playhead.style.height = `${Math.max(0, layout.trackY - layout.top)}px`

      handle.style.left = `${layout.playheadX - 7}px`
      handle.style.top = `${layout.trackY - 7}px`
      status.textContent = label
    },
    destroy() {
      layer.remove()
    },
  }
}
