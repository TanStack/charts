import {
  synchronizedCursorColors,
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
} from './data'
import type { ConformanceInput } from '../../types'

export interface SynchronizedSummary {
  root: HTMLDivElement
  date: HTMLSpanElement
  primary: HTMLSpanElement
  secondary: HTMLSpanElement
}

export function createSynchronizedSummary(
  document: Document,
): SynchronizedSummary {
  const root = document.createElement('div')
  root.dataset.conformanceSynchronizedSummary = ''
  root.setAttribute('role', 'status')
  root.setAttribute('aria-live', 'polite')
  root.setAttribute('aria-atomic', 'true')
  Object.assign(root.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    alignItems: 'center',
    gap: '8px',
    minHeight: '56px',
    padding: '6px 12px',
    boxSizing: 'border-box',
    borderBottom: '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
    background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
    color: 'CanvasText',
    font: '500 12px/1.25 system-ui, sans-serif',
  })

  const date = summaryOutput(document, 'Linked date', 'currentColor')
  date.dataset.conformanceSynchronizedDate = ''
  const primary = summaryOutput(
    document,
    'Throughput',
    synchronizedCursorColors.primary,
  )
  primary.dataset.conformanceSynchronizedPrimary = ''
  const secondary = summaryOutput(
    document,
    'Error rate',
    synchronizedCursorColors.secondary,
  )
  secondary.dataset.conformanceSynchronizedSecondary = ''
  root.append(
    date.parentElement!,
    primary.parentElement!,
    secondary.parentElement!,
  )
  return { root, date, primary, secondary }
}

export function updateSynchronizedSummary(
  summary: SynchronizedSummary,
  date: Date | null,
  input: ConformanceInput,
  pinned: boolean,
) {
  if (!date) {
    summary.date.textContent = 'Focus either chart'
    summary.primary.textContent = '—'
    summary.secondary.textContent = '—'
    summary.root.dataset.pinned = 'false'
    return
  }

  const primary = synchronizedCursorDatumAtDate('primary', input.revision, date)
  const secondary = synchronizedCursorDatumAtDate(
    'secondary',
    input.revision,
    date,
  )
  summary.date.textContent = `${formatDate(date)}${pinned ? ' · pinned' : ''}`
  summary.primary.textContent = primary?.value.toLocaleString() ?? '—'
  summary.secondary.textContent =
    secondary?.value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    }) ?? '—'
  summary.root.dataset.date = synchronizedCursorDateKey(date)
  summary.root.dataset.pinned = String(pinned)
}

function summaryOutput(document: Document, labelText: string, color: string) {
  const cell = document.createElement('label')
  Object.assign(cell.style, {
    display: 'grid',
    gridTemplateColumns: '8px minmax(0, 1fr)',
    gridTemplateRows: 'auto auto',
    columnGap: '6px',
    minWidth: '0',
  })
  const swatch = document.createElement('span')
  Object.assign(swatch.style, {
    gridRow: '1 / 3',
    alignSelf: 'center',
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: color,
  })
  const label = document.createElement('span')
  label.textContent = labelText
  Object.assign(label.style, {
    overflow: 'hidden',
    color: 'currentColor',
    fontSize: '10px',
    letterSpacing: '0.02em',
    opacity: '0.68',
    textOverflow: 'ellipsis',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  })
  const value = document.createElement('span')
  value.textContent = labelText === 'Linked date' ? 'Focus either chart' : '—'
  Object.assign(value.style, {
    overflow: 'hidden',
    fontWeight: '700',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })
  cell.append(swatch, label, value)
  return value
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
