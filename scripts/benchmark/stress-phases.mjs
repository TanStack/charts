// Raw scatter has independent mount and update trials, not a continuous stream.
// Give each trial its own context and deadline, identically for every renderer.
export async function runStressTimingPhases(workload, run, expectedSamples) {
  if (workload.id !== 'raw-scatter') return run(undefined)
  const phases = [
    { name: 'mount', mount: true, updates: [] },
    ...workload.updates.map((kind) => ({
      name: `update:${kind}`,
      mount: false,
      updates: [kind],
    })),
  ]
  const results = []
  for (const phase of phases) {
    const startedAt = Date.now()
    let result = await run(phase)
    if (
      result.status === 'ok' &&
      (result.updates.map((update) => update.kind).join(',') !==
        phase.updates.join(',') ||
        (results.length && result.digest !== results[0].result.digest) ||
        (expectedSamples !== undefined &&
          (phase.mount
            ? result.mount.rawSamples.length !== expectedSamples
            : result.updates.some(
                (update) => update.timing.rawSamples.length !== expectedSamples,
              ))))
    ) {
      result = {
        ...result,
        status: 'error',
        error:
          'Incomplete timing samples, update kinds, or inconsistent source digest.',
      }
    }
    results.push({
      phase: phase.name,
      elapsedMs: Date.now() - startedAt,
      result,
    })
    if (result.status !== 'ok') {
      return {
        ...result,
        error: `${phase.name}: ${result.error}`,
        timingPhases: results,
      }
    }
  }
  const recoveries = results.flatMap(({ result }) =>
    result.recovery ? [result.recovery] : [],
  )
  return {
    ...results[0].result,
    updates: results.flatMap(({ result }) => result.updates),
    timingPhases: results.map(({ phase, elapsedMs, result }) => ({
      phase,
      elapsedMs,
      recovery: result.recovery,
    })),
    ...(recoveries.length
      ? {
          recovery: {
            phase: 'timing',
            attempts:
              1 +
              recoveries.reduce(
                (total, recovery) => total + recovery.attempts - 1,
                0,
              ),
            recovered: true,
            errors: recoveries.flatMap((recovery) => recovery.errors),
          },
        }
      : {}),
    longTasks: {
      count: results.reduce(
        (sum, { result }) => sum + result.longTasks.count,
        0,
      ),
      totalMs: results.reduce(
        (sum, { result }) => sum + result.longTasks.totalMs,
        0,
      ),
      maximumMs: Math.max(
        ...results.map(({ result }) => result.longTasks.maximumMs),
      ),
      entries: results.flatMap(({ phase, result }) =>
        result.longTasks.entries.map((entry) => ({ ...entry, phase })),
      ),
    },
  }
}
