export const rechartsAreaAnimationDuration = 760
export const rechartsAreaAnimationFallbackDelay =
  rechartsAreaAnimationDuration + 120

export function createBoundedAnimationTracker(
  onChange: (animating: boolean) => void,
) {
  let tracks = 0
  let fallback: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const clearFallback = () => {
    if (fallback === undefined) return
    clearTimeout(fallback)
    fallback = undefined
  }

  const finish = () => {
    if (disposed) return
    const wasRunning = tracks > 0
    tracks = 0
    clearFallback()
    if (wasRunning) onChange(false)
  }

  const scheduleFallback = () => {
    clearFallback()
    fallback = setTimeout(finish, rechartsAreaAnimationFallbackDelay)
  }

  return {
    start() {
      if (disposed) return
      const wasRunning = tracks > 0
      tracks += 1
      scheduleFallback()
      if (!wasRunning) onChange(true)
    },
    end() {
      if (disposed) return
      if (tracks <= 1) {
        finish()
        return
      }
      tracks -= 1
    },
    dispose() {
      if (disposed) return
      const wasRunning = tracks > 0
      disposed = true
      tracks = 0
      clearFallback()
      if (wasRunning) onChange(false)
    },
    isRunning() {
      return !disposed && tracks > 0
    },
  }
}
