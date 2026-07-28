export function completedResults(results) {
  return results.filter((result) => result.status === 'ok')
}

export function correctnessValidResults(results, failures) {
  return completedResults(results).filter(
    (result) =>
      !failures.some((failure) => failure.startsWith(`${result.id}: `)),
  )
}
