// Keep only this fullscreen map awake; release on exit, hiding or unmount.
export function maintainFullscreenWakeLock({
  document,
  navigator,
  element,
  onStatus,
}) {
  let disposed = false
  let lock = null
  let pending = false
  let generation = 0
  const wanted = () =>
    !disposed &&
    Boolean(element()) &&
    document.fullscreenElement === element() &&
    document.visibilityState === 'visible'
  const release = (sentinel) => {
    if (sentinel) void sentinel.release().catch(() => {})
  }
  const sync = async () => {
    if (!wanted()) {
      generation++
      const previous = lock
      lock = null
      release(previous)
      if (!disposed) onStatus('idle')
      return
    }
    if (lock || pending) return
    if (!navigator.wakeLock?.request) {
      onStatus('unavailable')
      return
    }
    pending = true
    const requestGeneration = generation
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      if (!wanted() || requestGeneration !== generation) {
        release(sentinel)
      } else {
        lock = sentinel
        onStatus(sentinel.released ? 'unavailable' : 'active')
        sentinel.addEventListener(
          'release',
          () => {
            if (lock !== sentinel) return
            lock = null
            if (!disposed) onStatus(wanted() ? 'unavailable' : 'idle')
          },
          { once: true },
        )
        if (sentinel.released) lock = null
      }
    } catch {
      if (wanted() && requestGeneration === generation) onStatus('unavailable')
    } finally {
      pending = false
      // A hide/show or fullscreen exit/re-entry happened during the request.
      if (!disposed && requestGeneration !== generation) void sync()
    }
  }
  document.addEventListener('fullscreenchange', sync)
  document.addEventListener('visibilitychange', sync)
  void sync()
  return () => {
    disposed = true
    document.removeEventListener('fullscreenchange', sync)
    document.removeEventListener('visibilitychange', sync)
    void sync()
  }
}
