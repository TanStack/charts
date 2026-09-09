export function readChartMotionState(root: ParentNode) {
  return (
    root.querySelector('svg.ts-chart')?.getAttribute('data-ts-motion-state') ??
    null
  )
}

export function settleChartMotion(root: HTMLElement, timeout: number) {
  const view = root.ownerDocument.defaultView
  if (!view) return Promise.resolve()
  const started = view.performance.now()

  return new Promise<void>((resolve) => {
    const check = () => {
      const state = readChartMotionState(root)
      if (
        ((state === 'finished' || state === null) &&
          !hasActiveAnimations(root)) ||
        view.performance.now() - started >= timeout
      ) {
        resolve()
        return
      }
      view.requestAnimationFrame(check)
    }
    check()
  })
}

function hasActiveAnimations(root: HTMLElement) {
  if (typeof root.getAnimations !== 'function') return false
  return root
    .getAnimations({ subtree: true })
    .some((animation) => animation.pending || animation.playState === 'running')
}
