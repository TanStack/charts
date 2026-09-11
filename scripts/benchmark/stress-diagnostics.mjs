export function createStressDiagnostics(
  enabled,
  emit = () => {},
  now = Date.now,
) {
  const startedAt = now()
  const phases = []
  return {
    mark(phase) {
      if (!enabled) return
      const entry = { phase, elapsedMs: now() - startedAt }
      phases.push(entry)
      emit(entry)
    },
    snapshot() {
      return { elapsedMs: now() - startedAt, phases: [...phases] }
    },
    lastPhase() {
      return phases.at(-1)?.phase ?? 'not started'
    },
  }
}
