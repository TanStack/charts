import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const content = readFileSync(resolve(repositoryRoot, 'API-FRICTION.md'), 'utf8')
const allowedStatuses = new Set(['open', 'monitoring', 'resolved'])

describe('API friction log', () => {
  it('keeps one sequential index row and finding for every ID', () => {
    const indexIds = [...content.matchAll(/^\| (F-\d{3}) \|/gm)].map(
      ([, id]) => id,
    )
    const findingIds = [...content.matchAll(/^### (F-\d{3}) —/gm)].map(
      ([, id]) => id,
    )

    expect(new Set(indexIds).size).toBe(indexIds.length)
    expect(new Set(findingIds).size).toBe(findingIds.length)
    expect(findingIds).toEqual(indexIds)
    expect(indexIds).toEqual(
      Array.from(
        { length: indexIds.length },
        (_, index) => `F-${String(index + 1).padStart(3, '0')}`,
      ),
    )
  })

  it('keeps index and finding statuses synchronized', () => {
    const indexStatuses = new Map(
      [...content.matchAll(/^\| (F-\d{3}) \|.*\|\s*(\w+)\s*\|$/gm)].map(
        ([, id, status]) => [id, status],
      ),
    )
    const headings = [...content.matchAll(/^### (F-\d{3}) —[^\n]*$/gm)]
    const findingStatuses = new Map<string, string>()

    headings.forEach((heading, index) => {
      const start = heading.index ?? 0
      const end = headings[index + 1]?.index ?? content.length
      const block = content.slice(start, end)
      const status = block.match(/^- Status: (\w+)$/m)?.[1]
      if (status) findingStatuses.set(heading[1], status)
    })

    expect(indexStatuses.size).toBe(headings.length)
    expect(findingStatuses.size).toBe(headings.length)
    for (const [id, status] of findingStatuses) {
      expect(allowedStatuses.has(status)).toBe(true)
      expect(indexStatuses.get(id)).toBe(status)
    }
  })
})
