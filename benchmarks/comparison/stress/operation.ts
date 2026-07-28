import type { BenchmarkOperation } from '../types'

declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_VARIABLE_SIZE: boolean

export const benchmarkStressEnabled =
  typeof BENCHMARK_STRESS !== 'undefined' && BENCHMARK_STRESS

export const benchmarkVariableSizeEnabled =
  typeof BENCHMARK_VARIABLE_SIZE !== 'undefined' && BENCHMARK_VARIABLE_SIZE

export interface BenchmarkOperationController {
  operation?: BenchmarkOperation
  markFirstFrame: () => void
  markSettled: () => void
}

export function createFrameOperation(): BenchmarkOperation {
  const firstFrame = nextFrame()
  return {
    firstFrame,
    settled: firstFrame.then(nextFrame),
  }
}

export function createSignaledOperation(): BenchmarkOperationController {
  if (!benchmarkStressEnabled) {
    return {
      markFirstFrame() {},
      markSettled() {},
    }
  }

  const fallback = createFrameOperation()
  const firstSignal = deferred()
  const settledSignal = deferred()
  const firstFrame = withWatchdog(
    Promise.all([firstSignal.promise, fallback.firstFrame]).then(() => {}),
    'first-frame',
  )
  const settled = Promise.all([
    firstFrame,
    withWatchdog(settledSignal.promise, 'settled'),
    fallback.settled,
  ]).then(() => {})

  return {
    operation: { firstFrame, settled },
    markFirstFrame: firstSignal.resolve,
    markSettled: settledSignal.resolve,
  }
}

function withWatchdog(promise: Promise<void>, phase: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Benchmark renderer did not signal ${phase}.`))
    }, 5_000)
    void promise.then(
      () => {
        clearTimeout(timeout)
        resolve()
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
