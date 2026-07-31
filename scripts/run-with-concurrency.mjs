import assert from 'node:assert/strict'

export async function runWithConcurrency(values, concurrency, operation) {
  assert.ok(
    Number.isSafeInteger(concurrency) && concurrency > 0,
    'Concurrency must be a positive integer',
  )
  assert.equal(typeof operation, 'function', 'Operation must be a function')

  let nextIndex = 0
  const failures = []
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex
        nextIndex += 1
        try {
          await operation(values[index], index)
        } catch (error) {
          failures.push({ error, index })
        }
      }
    },
  )

  const workerResults = await Promise.allSettled(workers)
  workerResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      failures.push({ error: result.reason, index: values.length + index })
    }
  })

  if (failures.length > 0) {
    failures.sort((left, right) => left.index - right.index)
    throw new AggregateError(
      failures.map((failure) => failure.error),
      `${failures.length} concurrent operation${failures.length === 1 ? '' : 's'} failed`,
    )
  }
}
