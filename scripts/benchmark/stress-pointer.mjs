// This function is also installed directly in the browser by Playwright.
export function installStressPointerTiming(host = globalThis) {
  let pending
  let cancel

  host.__stressPointerBegin = (mode, previousSignature) => {
    if (pending) throw new Error('Pointer timing is already armed.')
    if (mode !== 'activate' && mode !== 'change') {
      throw new Error(`Unknown pointer timing mode: ${mode}`)
    }
    if (host.__stressPointerActive() !== (mode === 'change')) {
      throw new Error(`Pointer ${mode} timing has the wrong initial state.`)
    }
    let timer
    let frame
    let listener
    const result = new Promise((resolve, reject) => {
      const finish = (error, value) => {
        host.clearTimeout(timer)
        if (frame !== undefined) host.cancelAnimationFrame(frame)
        host.document.removeEventListener('pointermove', listener, true)
        cancel = undefined
        if (error) reject(error)
        else resolve(value)
      }
      cancel = () => finish(new Error('Pointer timing cancelled.'))
      // Bound event delivery too, not only the frames after an event arrives.
      let receivedEvent = false
      timer = host.setTimeout(
        () =>
          finish(
            new Error(
              receivedEvent
                ? `Pointer ${mode} did not settle within 2 seconds.`
                : `Pointer ${mode} did not receive pointermove within 2 seconds.`,
            ),
          ),
        2_000,
      )
      listener = (event) => {
        receivedEvent = true
        const startedAt = host.performance.now()
        const poll = () => {
          const signature = host.__stressPointerSignature()
          if (
            host.__stressPointerActive() &&
            (mode === 'activate' ||
              (signature !== undefined && signature !== previousSignature))
          ) {
            finish(undefined, {
              durationMs: host.performance.now() - startedAt,
              trusted: event.isTrusted,
              ...(mode === 'change' ? { signature } : {}),
            })
          } else {
            frame = host.requestAnimationFrame(poll)
          }
        }
        frame = host.requestAnimationFrame(poll)
      }
      host.document.addEventListener('pointermove', listener, {
        capture: true,
        once: true,
      })
    })
    // Attach rejection handling before returning readiness to Playwright.
    pending = result.then(
      (value) => ({ value }),
      (error) => ({ error: error.message }),
    )
    return true
  }
  host.__stressPointerRead = async () => {
    if (!pending) throw new Error('Pointer timing is not armed.')
    const owned = pending
    try {
      const outcome = await owned
      if (outcome.error) throw new Error(outcome.error)
      return outcome.value
    } finally {
      if (pending === owned) pending = undefined
    }
  }
  host.__stressPointerCancel = () => {
    cancel?.()
    pending = undefined
  }
}

export async function measureTrustedPointer(
  page,
  mode,
  target,
  previousSignature,
) {
  // Await registration, not the eventual sample, before dispatching input.
  await page.evaluate(
    ({ mode, previousSignature }) =>
      globalThis.__stressPointerBegin(mode, previousSignature),
    { mode, previousSignature },
  )
  try {
    await page.mouse.move(target.x, target.y)
    return await page.evaluate(() => globalThis.__stressPointerRead())
  } catch (error) {
    await page
      .evaluate(() => globalThis.__stressPointerCancel())
      .catch(() => {})
    throw error
  }
}
