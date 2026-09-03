export function estimateConformanceCaseWeight(entry, profile) {
  const variantCount = profile.widths.length * profile.themes.length
  const sampleCount = profile.warmup + profile.samples
  const baseMeasurementWeight = 2 * (sampleCount * 2 + variantCount * 4 + 12)
  const geometryWeight = (entry.geometry?.length ?? 0) * variantCount
  const interactionWeight = (entry.interactionScenarios ?? []).reduce(
    (total, scenario) =>
      total +
      variantCount *
        (4 +
          scenario.steps.reduce(
            (stepTotal, step) => stepTotal + interactionStepWeight(step),
            0,
          )),
    0,
  )

  return baseMeasurementWeight + geometryWeight + interactionWeight
}

function interactionStepWeight(step) {
  const repeatedDriverSteps = Number.isInteger(step.steps) ? step.steps : 0
  const waitFrames =
    step.type === 'wait' ? Math.ceil(step.durationMs / (1000 / 60)) : 0
  const assertions =
    step.type === 'assert' && Array.isArray(step.assertions)
      ? step.assertions.length
      : 0
  return 1 + repeatedDriverSteps + waitFrames + assertions
}
