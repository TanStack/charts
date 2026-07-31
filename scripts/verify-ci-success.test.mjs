import { describe, expect, it } from 'vitest'
import { findSuccessfulMainRun } from './verify-ci-success.mjs'

const revision = 'a'.repeat(40)

describe('release CI gate', () => {
  it('accepts only a completed successful main push for the exact revision', () => {
    const valid = {
      id: 1,
      conclusion: 'success',
      event: 'push',
      head_branch: 'main',
      head_sha: revision,
      status: 'completed',
    }
    expect(
      findSuccessfulMainRun(
        [
          { ...valid, id: 2, head_sha: 'b'.repeat(40) },
          { ...valid, id: 3, event: 'pull_request' },
          { ...valid, id: 4, conclusion: 'failure' },
          { ...valid, id: 5, head_branch: 'release' },
          { ...valid, id: 6, status: 'in_progress' },
          valid,
        ],
        revision,
      ),
    ).toEqual(valid)
  })
})
