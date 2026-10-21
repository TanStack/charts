import { useMemo, useSyncExternalStore } from 'react'
import { getBrowserMapLocale, getMapI18n } from './i18n.js'

function subscribe(onChange) {
  window.addEventListener('languagechange', onChange)
  return () => window.removeEventListener('languagechange', onChange)
}

// A stable English server snapshot also keeps the first hydration render consistent.
const serverLocale = () => 'en-US'

export function useMapI18n() {
  const locale = useSyncExternalStore(
    subscribe,
    getBrowserMapLocale,
    serverLocale,
  )
  return useMemo(() => getMapI18n(locale), [locale])
}
