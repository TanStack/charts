import assert from 'node:assert/strict'

export const releaseRepositorySlug = 'TanStack/charts'
export const releaseRepositoryUrl = `https://github.com/${releaseRepositorySlug}`
export const releaseWorkflowPath = '.github/workflows/release.yml'
export const provenancePredicateType = 'https://slsa.dev/provenance/v1'
export const githubWorkflowBuildType =
  'https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1'

export function validateReleaseEnvironment({
  env,
  expectedTag,
  expectedRevision = env.GITHUB_SHA,
}) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Release requires GitHub Actions')
  assert.equal(env.GITHUB_EVENT_NAME, 'push', 'Release requires a push event')
  assert.equal(env.GITHUB_REF_TYPE, 'tag', 'Release requires a tag ref')
  assert.equal(
    env.GITHUB_REF_NAME,
    expectedTag,
    `Release requires tag ${expectedTag}`,
  )
  assert.equal(
    env.GITHUB_REF,
    `refs/tags/${expectedTag}`,
    `Release requires refs/tags/${expectedTag}`,
  )
  assert.equal(
    env.GITHUB_REPOSITORY,
    releaseRepositorySlug,
    `Release requires ${releaseRepositorySlug}`,
  )
  assert.match(
    expectedRevision ?? '',
    /^[0-9a-f]{40}$/,
    'Release requires an exact GitHub revision',
  )
  assert.equal(
    env.GITHUB_SHA,
    expectedRevision,
    'Release revision differs from GITHUB_SHA',
  )
}

export function validateTrustedPublishingNpmVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim())
  assert.ok(match, `Invalid npm version: ${version}`)
  const parts = match.slice(1).map(Number)
  assert.ok(
    compareVersions(parts, [11, 5, 1]) >= 0,
    `npm ${version.trim()} cannot use trusted publishing; expected 11.5.1 or newer`,
  )
}

export function expectedPackagePurl(name, version) {
  const scoped = /^(@[^/]+)\/([^/]+)$/.exec(name)
  const encodedName = scoped
    ? `${encodeURIComponent(scoped[1])}/${encodeURIComponent(scoped[2])}`
    : encodeURIComponent(name)
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`
}

export function integritySha512Hex(integrity) {
  const match = /^sha512-([A-Za-z0-9+/]+={0,2})$/.exec(integrity)
  assert.ok(match, `Expected sha512 integrity, received ${integrity}`)
  const digest = Buffer.from(match[1], 'base64')
  assert.equal(digest.byteLength, 64, 'sha512 integrity must contain 64 bytes')
  assert.equal(
    digest.toString('base64'),
    match[1],
    'sha512 integrity is not canonical base64',
  )
  return digest.toString('hex')
}

export function decodeProvenanceStatement(attestationDocument) {
  assert.ok(
    Array.isArray(attestationDocument?.attestations),
    'Attestation response must include attestations',
  )
  const matches = attestationDocument.attestations.filter(
    (attestation) => attestation?.predicateType === provenancePredicateType,
  )
  assert.equal(
    matches.length,
    1,
    'Attestation response must include exactly one SLSA provenance bundle',
  )
  const envelope = matches[0].bundle?.dsseEnvelope
  assert.equal(
    envelope?.payloadType,
    'application/vnd.in-toto+json',
    'Provenance bundle has the wrong DSSE payload type',
  )
  assert.ok(
    Array.isArray(envelope?.signatures) && envelope.signatures.length > 0,
    'Provenance bundle must include a DSSE signature',
  )
  assert.match(
    envelope?.payload ?? '',
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'Provenance payload must be canonical base64',
  )
  return JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8'))
}

export function validatePackageProvenance({
  artifact,
  attestationDocument,
  revision,
  tag,
}) {
  const statement = decodeProvenanceStatement(attestationDocument)
  const expectedRef = `refs/tags/${tag}`
  const expectedPurl = expectedPackagePurl(
    artifact.name,
    artifact.manifest.version,
  )
  const expectedSha512 = integritySha512Hex(artifact.integrity)

  assert.equal(
    statement?._type,
    'https://in-toto.io/Statement/v1',
    `${artifact.name} provenance has the wrong statement type`,
  )
  assert.equal(
    statement?.predicateType,
    provenancePredicateType,
    `${artifact.name} provenance has the wrong predicate type`,
  )
  assert.equal(
    statement?.subject?.length,
    1,
    `${artifact.name} provenance must have one subject`,
  )
  assert.equal(
    statement.subject[0]?.name,
    expectedPurl,
    `${artifact.name} provenance has the wrong package PURL`,
  )
  assert.equal(
    statement.subject[0]?.digest?.sha512,
    expectedSha512,
    `${artifact.name} provenance has the wrong tarball digest`,
  )

  const buildDefinition = statement.predicate?.buildDefinition
  assert.equal(
    buildDefinition?.buildType,
    githubWorkflowBuildType,
    `${artifact.name} provenance has the wrong build type`,
  )
  assert.deepEqual(
    buildDefinition?.externalParameters?.workflow,
    {
      ref: expectedRef,
      repository: releaseRepositoryUrl,
      path: releaseWorkflowPath,
    },
    `${artifact.name} provenance has the wrong workflow identity`,
  )

  const expectedDependency = `git+${releaseRepositoryUrl}@${expectedRef}`
  const resolvedDependencies = buildDefinition?.resolvedDependencies
  assert.ok(
    Array.isArray(resolvedDependencies),
    `${artifact.name} provenance lacks resolved dependencies`,
  )
  const sourceDependencies = resolvedDependencies.filter(
    (dependency) => dependency?.uri === expectedDependency,
  )
  assert.equal(
    sourceDependencies.length,
    1,
    `${artifact.name} provenance must resolve the tagged repository once`,
  )
  assert.equal(
    sourceDependencies[0]?.digest?.gitCommit,
    revision,
    `${artifact.name} provenance resolved the wrong Git commit`,
  )
  return statement
}

export function verifiedAttestationBundles(artifacts, audit) {
  assert.deepEqual(
    audit?.invalid,
    [],
    'npm found invalid registry signatures or attestations',
  )
  assert.deepEqual(audit?.missing, [], 'npm found missing registry signatures')
  assert.ok(
    Array.isArray(audit?.verified),
    'npm signature audit omitted verified packages',
  )

  const bundles = new Map()
  for (const artifact of artifacts) {
    const matches = audit.verified.filter(
      (entry) =>
        entry?.name === artifact.name &&
        entry?.version === artifact.manifest.version,
    )
    assert.equal(
      matches.length,
      1,
      `${artifact.name}@${artifact.manifest.version} must have one verified npm attestation`,
    )
    assert.ok(
      Array.isArray(matches[0].attestationBundles),
      `${artifact.name}@${artifact.manifest.version} lacks verified attestation bundles`,
    )
    decodeProvenanceStatement({
      attestations: matches[0].attestationBundles,
    })
    bundles.set(artifact.name, matches[0].attestationBundles)
  }
  return bundles
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}
