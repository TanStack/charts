import { describe, expect, it } from 'vitest'
import { classifyReleaseStatus } from './release-status.mjs'

describe('automated release status', () => {
  it('waits while changesets still need a version pull request', () => {
    expect(
      classifyReleaseStatus({
        hasPendingChangesets: true,
        packageStates: ['missing'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: false,
      dispatch: false,
      reason: 'pending-changesets',
    })
  })

  it('creates and dispatches a new release tag when packages are missing', () => {
    expect(
      classifyReleaseStatus({
        hasPendingChangesets: false,
        packageStates: ['missing', 'missing'],
        releaseExists: false,
        tagRevision: null,
      }),
    ).toEqual({
      createTag: true,
      dispatch: true,
      reason: 'publish',
    })
  })

  it('can resume publishing or GitHub release creation idempotently', () => {
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'missing'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: true,
      reason: 'publish',
    })
    expect(
      classifyReleaseStatus({
        expectedRevision: 'a'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['published', 'published'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: true,
      reason: 'finalize',
    })
  })

  it('rejects dispatching an existing tag for a different revision', () => {
    expect(() =>
      classifyReleaseStatus({
        expectedRevision: 'b'.repeat(40),
        hasPendingChangesets: false,
        packageStates: ['missing'],
        releaseExists: false,
        tagRevision: 'a'.repeat(40),
      }),
    ).toThrow('existing release tag points to a different revision')
  })

  it('rejects an existing tag when the expected revision is missing', () => {
    for (const expectedRevision of [undefined, '']) {
      expect(() =>
        classifyReleaseStatus({
          expectedRevision,
          hasPendingChangesets: false,
          packageStates: ['missing'],
          releaseExists: false,
          tagRevision: 'a'.repeat(40),
        }),
      ).toThrow('existing release tag requires the expected revision')
    }
  })

  it('does nothing after npm, the tag, and GitHub release all exist', () => {
    expect(
      classifyReleaseStatus({
        hasPendingChangesets: false,
        packageStates: ['published', 'published'],
        releaseExists: true,
        tagRevision: 'a'.repeat(40),
      }),
    ).toEqual({
      createTag: false,
      dispatch: false,
      reason: 'released',
    })
  })
})
