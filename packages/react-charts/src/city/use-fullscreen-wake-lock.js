import { useEffect, useState } from 'react'
import { maintainFullscreenWakeLock } from './engine/lib/fullscreen-wake-lock.js'

export function useFullscreenWakeLock(elementRef) {
  const [status, setStatus] = useState('idle')
  useEffect(
    () =>
      maintainFullscreenWakeLock({
        document,
        navigator,
        element: () => elementRef.current,
        onStatus: setStatus,
      }),
    [elementRef],
  )
  return status
}
