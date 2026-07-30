import type { SynchronizedCursorView } from './model'

export const synchronizedCursorColors: Readonly<
  Record<SynchronizedCursorView, string>
> = {
  current: '#2563eb',
  previous: '#e11d48',
}
