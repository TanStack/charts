import { test } from 'vitest'
import assert from 'node:assert/strict'
import { maintainFullscreenWakeLock } from './engine/lib/fullscreen-wake-lock.js'

const flush = () => new Promise((resolve) => setImmediate(resolve))
function setup(request) {
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const element = {}
  const locks = []
  const statuses = []
  let requests = 0
  const navigator = {
    wakeLock: {
      request: async (type) => {
        requests++
        assert.equal(type, 'screen')
        if (request) return request()
        const lock = new EventTarget()
        lock.released = false
        lock.release = async () => {
          lock.released = true
          lock.dispatchEvent(new Event('release'))
        }
        locks.push(lock)
        return lock
      },
    },
  }
  const dispose = maintainFullscreenWakeLock({
    document,
    navigator,
    element: () => element,
    onStatus: (status) => statuses.push(status),
  })
  return {
    document,
    navigator,
    element,
    locks,
    statuses,
    dispose,
    get requests() {
      return requests
    },
    async fullscreen(value) {
      document.fullscreenElement = value
      document.dispatchEvent(new Event('fullscreenchange'))
      await flush()
    },
    async visible(value) {
      document.visibilityState = value
      document.dispatchEvent(new Event('visibilitychange'))
      await flush()
    },
  }
}

test('wake lock belongs only to this fullscreen map, reacquires on visibility and releases on exit', async () => {
  const state = setup()
  assert.equal(state.requests, 0)
  await state.fullscreen({})
  assert.equal(state.requests, 0)
  await state.fullscreen(state.element)
  assert.equal(state.requests, 1)
  assert.equal(state.statuses.at(-1), 'active')
  await state.visible('visible')
  assert.equal(state.requests, 1)
  await state.visible('hidden')
  assert.equal(state.locks[0].released, true)
  await state.visible('visible')
  assert.equal(state.requests, 2)
  await state.fullscreen(null)
  assert.equal(state.locks[1].released, true)
  assert.equal(state.statuses.at(-1), 'idle')
  state.dispose()
})

test('unmount releases the lock and removes event listeners', async () => {
  const state = setup()
  await state.fullscreen(state.element)
  state.dispose()
  assert.equal(state.locks[0].released, true)
  await state.visible('visible')
  assert.equal(state.requests, 1)
})

test('late requests cannot keep the screen awake after fullscreen exit or unmount', async () => {
  for (const unmount of [false, true]) {
    let resolve
    const state = setup(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    await state.fullscreen(state.element)
    if (unmount) state.dispose()
    else await state.fullscreen(null)
    let released = false
    resolve({
      release: async () => {
        released = true
      },
    })
    await flush()
    assert.equal(released, true)
    state.dispose()
  }
})

test('unsupported or rejected wake locks report unavailable without breaking fullscreen', async () => {
  for (const unsupported of [false, true]) {
    const state = setup(() => Promise.reject(new Error('NotAllowedError')))
    if (unsupported) delete state.navigator.wakeLock
    await state.fullscreen(state.element)
    assert.equal(state.statuses.at(-1), 'unavailable')
    assert.equal(state.document.fullscreenElement, state.element)
    state.dispose()
  }
})

test('system revocation reports unavailable and retries on the next visibility event', async () => {
  const state = setup()
  await state.fullscreen(state.element)
  await state.locks[0].release()
  assert.equal(state.statuses.at(-1), 'unavailable')
  assert.equal(state.requests, 1)
  await state.visible('visible')
  assert.equal(state.requests, 2)
  assert.equal(state.statuses.at(-1), 'active')
  state.dispose()
})
