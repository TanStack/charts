import assert from 'node:assert/strict'

export function validateTrustedPublishingNpmVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim())
  assert.ok(match, `Invalid npm version: ${version}`)
  const parts = match.slice(1).map(Number)
  assert.ok(
    compareVersions(parts, [11, 5, 1]) >= 0,
    `npm ${version.trim()} cannot use trusted publishing; expected 11.5.1 or newer`,
  )
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}
