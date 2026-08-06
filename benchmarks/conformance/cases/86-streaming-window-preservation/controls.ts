import type { StreamingViewportMode } from './model'

export interface StreamingControls {
  root: HTMLDivElement
  append: HTMLButtonElement
  follow: HTMLButtonElement
  showAll: HTMLButtonElement
  status: HTMLOutputElement
}

export function createStreamingControls(
  document: Document,
  handlers: {
    append: () => void
    follow: () => void
    showAll: () => void
  },
): StreamingControls {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Streaming viewport controls')
  Object.assign(root.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: '44px 18px',
    alignItems: 'center',
    gap: '4px 8px',
    padding: '6px 10px',
    boxSizing: 'border-box',
    background: 'Canvas',
    color: 'CanvasText',
    font: '500 12px/1.2 system-ui, sans-serif',
  })

  const append = controlButton(document, 'Append', 'Append one sample')
  append.dataset.streamingControl = 'append'
  append.addEventListener('click', handlers.append)

  const follow = controlButton(
    document,
    'Follow latest',
    'Follow the latest eight samples',
  )
  follow.dataset.streamingControl = 'follow'
  follow.addEventListener('click', handlers.follow)

  const showAll = controlButton(
    document,
    'Show all',
    'Unlock the viewport and show every sample',
  )
  showAll.dataset.streamingControl = 'all'
  showAll.addEventListener('click', handlers.showAll)

  const status = document.createElement('output')
  status.dataset.conformanceStreamingStatus = ''
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  Object.assign(status.style, {
    gridColumn: '1 / -1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'currentColor',
    opacity: '0.72',
  })

  root.append(append, follow, showAll, status)
  return { root, append, follow, showAll, status }
}

export function updateStreamingControls(
  controls: StreamingControls,
  options: {
    mode: StreamingViewportMode
    status: string
  },
) {
  controls.follow.setAttribute(
    'aria-pressed',
    String(options.mode === 'latest'),
  )
  controls.showAll.setAttribute('aria-pressed', String(options.mode === 'all'))
  controls.status.textContent = options.status
  controls.status.title = options.status
}

function controlButton(document: Document, text: string, ariaLabel: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = text
  button.setAttribute('aria-label', ariaLabel)
  Object.assign(button.style, {
    minWidth: '0',
    minHeight: '44px',
    padding: '0 10px',
    border: '1px solid color-mix(in srgb, CanvasText 22%, transparent)',
    borderRadius: '7px',
    background: 'Canvas',
    color: 'CanvasText',
    font: '600 12px/1.15 system-ui, sans-serif',
    cursor: 'pointer',
  })
  return button
}
