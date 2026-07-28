export interface FreeCursorDatum {
  id: string
  x: number
  y: number
}

export interface FreeCursorFraction {
  x: number
  y: number
}

export const freeCursorXDomain: readonly [number, number] = [0, 100]

export const freeCursorYDomain: readonly [number, number] = [0, 100]

const initialData: readonly FreeCursorDatum[] = [
  { id: 'a', x: 8, y: 28 },
  { id: 'b', x: 24, y: 63 },
  { id: 'c', x: 43, y: 47 },
  { id: 'd', x: 61, y: 78 },
  { id: 'e', x: 79, y: 39 },
  { id: 'f', x: 94, y: 68 },
]

export function freeCursorData(revision = 0): readonly FreeCursorDatum[] {
  const updated = revision % 2 === 1
  return initialData.map((datum) =>
    updated && datum.id === 'd' ? { ...datum, y: datum.y - 11 } : datum,
  )
}

export function freeCursorFractionFromAnchor(
  anchor: string,
): FreeCursorFraction | null {
  if (!anchor.startsWith('fraction:')) return null
  const [xText, yText] = anchor.slice('fraction:'.length).split(',')
  if (xText === undefined || yText === undefined) return null
  const x = Number(xText)
  const y = Number(yText)
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    return null
  }
  return { x, y }
}
