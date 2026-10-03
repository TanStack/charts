/** Package unit tests are validation inputs, not published runtime inputs. */
export function isPackageTestPath(path) {
  return /^packages\/[^/]+\/src\/.*\.(?:type-test|test|spec)\.(?:[cm]?[jt]sx?|tsrx)$/u.test(
    path,
  )
}

export function assertNoPackageTestInputs(inputs) {
  const tests = inputs.filter((path) =>
    isPackageTestPath(path.replaceAll('\\', '/')),
  )
  if (tests.length) {
    throw new Error(
      `Production bundle includes package tests: ${tests.join(', ')}`,
    )
  }
}
