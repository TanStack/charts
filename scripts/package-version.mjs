import semver from 'semver'

export function isExactNpmPackageVersion(value) {
  return (
    typeof value === 'string' &&
    /^\d/u.test(value) &&
    semver.valid(value) !== null
  )
}
