import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  decodeProvenanceStatement,
  expectedPackagePurl,
  githubWorkflowBuildType,
  integritySha512Hex,
  provenancePredicateType,
  releaseRepositoryUrl,
  releaseWorkflowPath,
  validatePackageProvenance,
  validateReleaseEnvironment,
  validateTrustedPublishingNpmVersion,
  verifiedAttestationBundles,
} from './release-security.mjs'
import {
  parseRemoteRefs,
  validateReleaseRevisionEvidence,
} from './verify-release-revision.mjs'

const revision = 'a'.repeat(40)
const tag = 'v0.0.1'
const integrity = `sha512-${Buffer.alloc(64, 0xab).toString('base64')}`
const artifact = {
  name: '@tanstack/charts',
  integrity,
  manifest: { version: '0.0.1' },
}

describe('release environment', () => {
  it('requires the exact repository, tag ref, and revision', () => {
    expect(() =>
      validateReleaseEnvironment({
        env: releaseEnvironment(),
        expectedTag: tag,
        expectedRevision: revision,
      }),
    ).not.toThrow()
    expect(() =>
      validateReleaseEnvironment({
        env: {
          ...releaseEnvironment(),
          GITHUB_REF: 'refs/heads/main',
        },
        expectedTag: tag,
        expectedRevision: revision,
      }),
    ).toThrow(/refs\/tags\/v0\.0\.1/)
    expect(() =>
      validateReleaseEnvironment({
        env: {
          ...releaseEnvironment(),
          GITHUB_EVENT_NAME: 'workflow_dispatch',
        },
        expectedTag: tag,
        expectedRevision: revision,
      }),
    ).not.toThrow()
  })

  it('requires an npm version with trusted publishing support', () => {
    expect(() => validateTrustedPublishingNpmVersion('11.5.1\n')).not.toThrow()
    expect(() => validateTrustedPublishingNpmVersion('11.18.0')).not.toThrow()
    expect(() => validateTrustedPublishingNpmVersion('11.5.0')).toThrow(
      /11\.5\.1 or newer/,
    )
  })
})

describe('release ref evidence', () => {
  it('requires an annotated remote tag peeled to the checked-out main commit', () => {
    const refs = parseRemoteRefs(
      `${'b'.repeat(40)}\trefs/tags/${tag}\n${revision}\trefs/tags/${tag}^{}\n`,
    )
    expect(() =>
      validateReleaseRevisionEvidence({
        headRevision: revision,
        mainRevision: 'c'.repeat(40),
        remoteRefs: refs,
        revision,
        tag,
        isMainAncestor: true,
      }),
    ).not.toThrow()
    refs.delete(`refs/tags/${tag}^{}`)
    expect(() =>
      validateReleaseRevisionEvidence({
        headRevision: revision,
        mainRevision: 'c'.repeat(40),
        remoteRefs: refs,
        revision,
        tag,
        isMainAncestor: true,
      }),
    ).toThrow(/must be annotated/)
  })
})

describe('npm provenance', () => {
  it('derives scoped PURLs and sha512 digests exactly', () => {
    expect(expectedPackagePurl('@tanstack/charts', '0.0.1')).toBe(
      'pkg:npm/%40tanstack/charts@0.0.1',
    )
    expect(integritySha512Hex(integrity)).toBe('ab'.repeat(64))
  })

  it('decodes and validates the exact workflow and tagged source revision', () => {
    const statement = provenanceStatement()
    const document = attestationDocument(statement)
    expect(decodeProvenanceStatement(document)).toEqual(statement)
    expect(
      validatePackageProvenance({
        artifact,
        attestationDocument: document,
        revision,
        tag,
      }),
    ).toEqual(statement)
  })

  it('rejects a valid-looking provenance statement for another source revision', () => {
    const document = attestationDocument(
      provenanceStatement({ sourceRevision: 'f'.repeat(40) }),
    )
    expect(() =>
      validatePackageProvenance({
        artifact,
        attestationDocument: document,
        revision,
        tag,
      }),
    ).toThrow(/resolved the wrong Git commit/)
  })

  it.each([
    [
      'package PURL',
      (statement) => {
        statement.subject[0].name = 'pkg:npm/%40tanstack/react-charts@0.0.1'
      },
      /wrong package PURL/,
    ],
    [
      'tarball digest',
      (statement) => {
        statement.subject[0].digest.sha512 = 'ff'.repeat(64)
      },
      /wrong tarball digest/,
    ],
    [
      'repository',
      (statement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.repository =
          'https://github.com/example/charts'
      },
      /wrong workflow identity/,
    ],
    [
      'workflow path',
      (statement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.path =
          '.github/workflows/other.yml'
      },
      /wrong workflow identity/,
    ],
    [
      'tag ref',
      (statement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.ref =
          'refs/heads/main'
      },
      /wrong workflow identity/,
    ],
  ])('rejects provenance with the wrong %s', (_, mutate, error) => {
    const statement = provenanceStatement()
    mutate(statement)
    expect(() =>
      validatePackageProvenance({
        artifact,
        attestationDocument: attestationDocument(statement),
        revision,
        tag,
      }),
    ).toThrow(error)
  })

  it('requires npm to cryptographically verify every release package attestation', () => {
    const bundles = attestationDocument(provenanceStatement()).attestations
    expect(
      verifiedAttestationBundles([artifact], {
        invalid: [],
        missing: [],
        verified: [
          {
            name: artifact.name,
            version: artifact.manifest.version,
            attestationBundles: bundles,
          },
        ],
      }).get(artifact.name),
    ).toEqual(bundles)
    expect(() =>
      verifiedAttestationBundles([artifact], {
        invalid: [],
        missing: [],
        verified: [],
      }),
    ).toThrow(/must have one verified npm attestation/)
  })
})

function releaseEnvironment() {
  return {
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF_TYPE: 'tag',
    GITHUB_REF_NAME: tag,
    GITHUB_REF: `refs/tags/${tag}`,
    GITHUB_REPOSITORY: 'TanStack/charts',
    GITHUB_SHA: revision,
  }
}

function provenanceStatement({ sourceRevision = revision } = {}) {
  const ref = `refs/tags/${tag}`
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [
      {
        name: 'pkg:npm/%40tanstack/charts@0.0.1',
        digest: { sha512: 'ab'.repeat(64) },
      },
    ],
    predicateType: provenancePredicateType,
    predicate: {
      buildDefinition: {
        buildType: githubWorkflowBuildType,
        externalParameters: {
          workflow: {
            ref,
            repository: releaseRepositoryUrl,
            path: releaseWorkflowPath,
          },
        },
        resolvedDependencies: [
          {
            uri: `git+${releaseRepositoryUrl}@${ref}`,
            digest: { gitCommit: sourceRevision },
          },
        ],
      },
    },
  }
}

function attestationDocument(statement) {
  return {
    attestations: [
      {
        predicateType: provenancePredicateType,
        bundle: {
          dsseEnvelope: {
            payload: Buffer.from(JSON.stringify(statement)).toString('base64'),
            payloadType: 'application/vnd.in-toto+json',
            signatures: [{ sig: 'example' }],
          },
        },
      },
    ],
  }
}
