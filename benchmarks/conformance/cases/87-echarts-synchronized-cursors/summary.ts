import {
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
} from './model'
import { travelers } from '@tanstack/charts-data/travelers'
import { selectSynchronizedCursorData } from './selection'
import { synchronizedCursorColors } from './colors'
import type { ConformanceInput } from '../../types'

export interface SynchronizedSummary {
  root: HTMLDivElement
  date: HTMLSpanElement
  current: HTMLSpanElement
  previous: HTMLSpanElement
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
  const current = summaryOutput(
    document,
    '2020 travelers',
    synchronizedCursorColors.current,
  )
  current.dataset.conformanceSynchronizedCurrent = ''
  const previous = summaryOutput(
    document,
    '2019 travelers',
    synchronizedCursorColors.previous,
  )
  previous.dataset.conformanceSynchronizedPrevious = ''
  root.append(
    date.parentElement!,
    current.parentElement!,
    previous.parentElement!,
  )
  return { root, date, current, previous }
}

export function updateSynchronizedSummary(
  summary: SynchronizedSummary,
  date: Date | null,
  input: ConformanceInput,
  pinned: boolean,
) {
  if (!date) {
    summary.date.textContent = 'Focus either chart'
    summary.current.textContent = '—'
    summary.previous.textContent = '—'
    delete summary.root.dataset.date
    summary.root.dataset.pinned = 'false'
    return
  }

  const rows = selectSynchronizedCursorData(travelers, input.revision)
  const row = synchronizedCursorDatumAtDate(rows, date)
  summary.date.textContent = `${formatDate(date)}${pinned ? ' · pinned' : ''}`
  summary.current.textContent = row?.current.toLocaleString() ?? '—'
  summary.previous.textContent = row?.previous.toLocaleString() ?? '—'
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
