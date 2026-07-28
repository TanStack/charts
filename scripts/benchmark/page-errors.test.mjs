import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import {
  attachPageErrorCollector,
  contextPageErrorFailure,
} from './page-errors.mjs'

describe('attachPageErrorCollector', () => {
  it('ignores non-error console messages', () => {
    const page = new EventEmitter()
    const collector = attachPageErrorCollector(page)

    page.emit('console', {
      type: () => 'warning',
      text: () => 'informational',
    })

    expect(() => collector.assertNone()).not.toThrow()
  })

  it('aggregates and deduplicates page and console errors', () => {
    const page = new EventEmitter()
    const collector = attachPageErrorCollector(page)

    page.emit('pageerror', new Error('lifecycle failure'))
    page.emit('pageerror', new Error('lifecycle failure'))
    page.emit('console', {
      type: () => 'error',
      text: () => 'console failure',
    })

    expect(() => collector.assertNone()).toThrow(
      'Page errors: lifecycle failure | console failure',
    )
  })
})

describe('contextPageErrorFailure', () => {
  it('rejects immediately when a new page emits an error', async () => {
    const context = new EventEmitter()
    context.pages = () => []
    const page = new EventEmitter()
    const failure = contextPageErrorFailure(context)
    const assertion = expect(failure).rejects.toThrow(
      'Page errors: lifecycle failure',
    )

    context.emit('page', page)
    page.emit('pageerror', new Error('lifecycle failure'))

    await assertion
  })

  it('rejects on console errors from an existing page', async () => {
    const context = new EventEmitter()
    const page = new EventEmitter()
    context.pages = () => [page]
    const failure = contextPageErrorFailure(context)
    const assertion = expect(failure).rejects.toThrow(
      'Page errors: console failure',
    )

    page.emit('console', {
      type: () => 'error',
      text: () => 'console failure',
    })

    await assertion
  })
})
