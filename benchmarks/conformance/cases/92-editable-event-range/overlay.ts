export interface EditableHandleLayout {
  x: number
  y: number
}

export function createEditableHandleOverlay(view: HTMLDivElement) {
  const document = view.ownerDocument
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.position = 'absolute'
  layer.style.inset = '0'
  layer.style.zIndex = '3'
  layer.style.pointerEvents = 'none'

  const handle = document.createElement('div')
  handle.style.position = 'absolute'
  handle.style.width = '16px'
  handle.style.height = '16px'
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

  layer.append(handle, status)
  view.append(layer)

  return {
    paint(layout: EditableHandleLayout, label: string) {
      handle.style.left = `${layout.x - 8}px`
      handle.style.top = `${layout.y - 8}px`
      status.textContent = label
    },
    destroy() {
      layer.remove()
    },
  }
}
