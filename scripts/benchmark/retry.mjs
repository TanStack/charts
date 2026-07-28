export async function retryFailedResult(run, phase) {
  const first = await run()
  if (first.status === 'ok' || first.retryable !== true) return first

  const second = await run()
  return {
    ...second,
    recovery: {
      phase,
      attempts: 2,
      recovered: second.status === 'ok',
      errors: [first.error, ...(second.status === 'ok' ? [] : [second.error])],
    },
  }
}

export function retryProgressSymbol(timing, memory) {
  if (timing.status !== 'ok' || memory?.status === 'error') return 'x'
  if (
    timing.recovery?.recovered === true ||
    memory?.recovery?.recovered === true
  ) {
    return 'r'
  }
  return '.'
}

export function collectRetryRecords(results) {
  return results.flatMap((row) => [
    ...(row.recovery
      ? [{ id: row.id, phase: row.recovery.phase, recovery: row.recovery }]
      : []),
    ...(row.memory?.recovery
      ? [
          {
            id: row.id,
            phase: row.memory.recovery.phase,
            recovery: row.memory.recovery,
          },
        ]
      : []),
  ])
}
