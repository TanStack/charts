import { describe, expect, it } from 'vitest'
import {
  completedResults,
  correctnessValidResults,
} from './result-validity.mjs'

describe('stress result validity', () => {
  const results = [
    { id: 'valid', status: 'ok' },
    { id: 'invalid', status: 'ok' },
    { id: 'invalid-longer', status: 'ok' },
    { id: 'runtime-error', status: 'error' },
  ]

  it('counts completed renderer cells independently from correctness', () => {
    expect(completedResults(results).map(({ id }) => id)).toEqual([
      'valid',
      'invalid',
      'invalid-longer',
    ])
  })

  it('excludes completed cells with a matching correctness failure', () => {
    expect(
      correctnessValidResults(results, [
        'invalid: pointer state was stale.',
        'runtime-error: Cell exceeded 120000 ms.',
      ]).map(({ id }) => id),
    ).toEqual(['valid', 'invalid-longer'])
  })
})
