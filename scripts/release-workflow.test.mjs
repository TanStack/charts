import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = await readFile(
  resolve(import.meta.dirname, '../.github/workflows/release.yml'),
  'utf8',
)

describe('release workflow security boundary', () => {
  it('keeps validation and post-publish verification outside OIDC', () => {
    expect(job('validate')).not.toContain('id-token: write')
    expect(job('verify')).not.toContain('id-token: write')
    expect(job('release')).not.toContain('id-token: write')
    expect(job('publish')).toContain('id-token: write')
    expect(workflow.match(/id-token: write/g)).toHaveLength(1)
  })

  it('publishes only checked artifacts from an exact-SHA checkout', () => {
    const publish = job('publish')
    expect(publish).toContain('needs: validate')
    expect(publish).toContain('ref: ${{ github.sha }}')
    expect(publish).toContain('actions/download-artifact@')
    expect(publish).toContain('path: .release-artifacts')
    expect(publish).not.toMatch(/\b(?:npm|pnpm) install\b/)
    expect(publish).not.toContain('corepack enable')
    expect(publish).not.toMatch(/\bpnpm (?:test|typecheck|docs:check)\b/)
    expect(publish).toMatch(
      /node scripts\/verify-release-revision\.mjs\s+node scripts\/publish-release\.mjs/,
    )
  })

  it('gates the GitHub release on independent package verification and fresh refs', () => {
    expect(job('verify')).toMatch(
      /needs: publish[\s\S]*node scripts\/verify-published-release\.mjs/,
    )
    const release = job('release')
    expect(release).toContain('needs: verify')
    expect(release).toContain('ref: ${{ github.sha }}')
    expect(release).toMatch(
      /node scripts\/verify-release-revision\.mjs[\s\S]*gh release create/,
    )
  })
})

function job(name) {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => line === `  ${name}:`)
  expect(start, `job ${name}`).toBeGreaterThan(-1)
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [a-z][a-z0-9_-]*:$/.test(lines[index])) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n')
}
